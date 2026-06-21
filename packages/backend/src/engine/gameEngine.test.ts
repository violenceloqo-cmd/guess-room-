import { test, expect } from "vitest";
import type { RoundResultPublic } from "@room-royale/shared";
import { GameEngine } from "./gameEngine.js";
import { PureSettlement } from "./settlement.js";
import type { EngineConfig } from "./types.js";

const POOL = 1_000_000_000n; // 1 SOL

function makeEngine(opts: {
  pickRoom: () => number;
  rollover?: boolean;
}) {
  let t = 1_000_000;
  let n = 0;
  const config: EngineConfig = {
    roundDurationSeconds: 60,
    lockBufferSeconds: 3,
    eliminationIntervalSeconds: 10,
    poolLamports: POOL,
    rolloverOnNoWinner: opts.rollover ?? true,
  };
  const engine = new GameEngine(config, {
    now: () => t,
    pickRoom: opts.pickRoom,
    newId: () => `round-${++n}`,
    settlement: new PureSettlement(opts.rollover ?? true),
  });
  const clock = {
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
  return { engine, clock };
}

const sec = (s: number) => s * 1000;

test("round opens on start in OPEN status with the base pool", () => {
  const { engine } = makeEngine({ pickRoom: () => 1 });
  engine.start({ autoTick: false });
  const snap = engine.getSnapshot();
  expect(snap.running).toBe(true);
  expect(snap.currentRound?.status).toBe("open");
  expect(snap.currentRound?.poolLamports).toBe(POOL.toString());
  expect(snap.currentRound?.roundNumber).toBe(1);
  engine.stop();
});

test("guess is accepted, one active pick per wallet (last wins)", () => {
  const { engine } = makeEngine({ pickRoom: () => 5 });
  engine.start({ autoTick: false });

  expect(engine.addGuess("alice", 3).accepted).toBe(true);
  expect(engine.addGuess("alice", 5).accepted).toBe(true); // changes pick
  expect(engine.addGuess("bob", 5).accepted).toBe(true);

  const counts = engine.getSnapshot().currentRound!.roomCounts;
  expect(counts["3"]).toBeUndefined(); // alice moved away from room 3
  expect(counts["5"]).toBe(2); // alice + bob
  engine.stop();
});

test("invalid room is rejected", () => {
  const { engine } = makeEngine({ pickRoom: () => 1 });
  engine.start({ autoTick: false });
  expect(engine.addGuess("alice", 0).accepted).toBe(false);
  expect(engine.addGuess("alice", 11).accepted).toBe(false);
  engine.stop();
});

test("guesses are rejected once the round locks", async () => {
  const { engine, clock } = makeEngine({ pickRoom: () => 1 });
  engine.start({ autoTick: false });
  expect(engine.addGuess("alice", 1).accepted).toBe(true);

  clock.advance(sec(60)); // reach lock (picking closes, elimination begins)
  await engine.tick();
  expect(engine.getSnapshot().currentRound?.status).toBe("eliminating");

  const res = engine.addGuess("bob", 1);
  expect(res.accepted).toBe(false);
  expect(res.reason).toBe("round_locked");
  engine.stop();
});

test("eliminations knock out every room except the winner, one at a time", async () => {
  const winningRoom = 6;
  const { engine, clock } = makeEngine({ pickRoom: () => winningRoom });
  engine.start({ autoTick: false });
  engine.addGuess("alice", winningRoom);

  clock.advance(sec(60));
  await engine.tick(); // begin elimination
  expect(engine.getSnapshot().currentRound?.eliminatedRooms).toHaveLength(0);

  clock.advance(sec(10));
  await engine.tick(); // first elimination
  let snap = engine.getSnapshot().currentRound!;
  expect(snap.eliminatedRooms).toHaveLength(1);
  expect(snap.eliminatedRooms).not.toContain(winningRoom);

  clock.advance(sec(40));
  await engine.tick(); // up to 5 eliminated
  snap = engine.getSnapshot().currentRound!;
  expect(snap.eliminatedRooms).toHaveLength(5);
  expect(snap.eliminatedRooms).not.toContain(winningRoom);
  engine.stop();
});

test("winners of the chosen room split the pool exactly", async () => {
  const winningRoom = 7;
  const { engine, clock } = makeEngine({ pickRoom: () => winningRoom });
  let settled: RoundResultPublic | null = null;
  engine.on("round:settled", (r) => {
    settled = r;
  });
  engine.start({ autoTick: false });

  engine.addGuess("alice", winningRoom);
  engine.addGuess("bob", winningRoom);
  engine.addGuess("carol", winningRoom);
  engine.addGuess("dave", 2); // loser

  clock.advance(sec(60)); // lock / begin elimination
  await engine.tick();
  clock.advance(sec(90)); // run all eliminations + settle
  await engine.tick();

  expect(settled).not.toBeNull();
  const result = settled as RoundResultPublic;
  expect(result.winningRoom).toBe(winningRoom);
  expect(result.rolledOver).toBe(false);
  expect(result.payouts).toHaveLength(3);
  const wallets = result.payouts.map((p) => p.wallet).sort();
  expect(wallets).toEqual(["alice", "bob", "carol"]);
  const sum = result.payouts.reduce((acc, p) => acc + BigInt(p.lamports), 0n);
  expect(sum).toBe(POOL);
  engine.stop();
});

test("no winner rolls the pool over into the next round", async () => {
  const winningRoom = 9;
  const { engine, clock } = makeEngine({ pickRoom: () => winningRoom, rollover: true });
  engine.start({ autoTick: false });

  engine.addGuess("alice", 1); // nobody picks room 9
  clock.advance(sec(60));
  await engine.tick();
  clock.advance(sec(90));
  await engine.tick(); // settle round 1, opens round 2

  const snap = engine.getSnapshot();
  expect(snap.lastResult?.rolledOver).toBe(true);
  expect(snap.currentRound?.roundNumber).toBe(2);
  // round 2 pool = base + rolled-over base
  expect(snap.currentRound?.poolLamports).toBe((POOL * 2n).toString());
  engine.stop();
});

test("full lifecycle advances open -> locked -> settled and opens next", async () => {
  const { engine, clock } = makeEngine({ pickRoom: () => 4 });
  const events: string[] = [];
  engine.on("round:open", () => events.push("open"));
  engine.on("round:lock", () => events.push("lock"));
  engine.on("round:settling", () => events.push("settling"));
  engine.on("round:settled", () => events.push("settled"));

  engine.start({ autoTick: false });
  engine.addGuess("alice", 4);

  clock.advance(sec(60));
  await engine.tick(); // lock / begin elimination
  clock.advance(sec(90));
  await engine.tick(); // run eliminations, settle + open next

  expect(events).toEqual(["open", "lock", "settling", "settled", "open"]);
  expect(engine.getSnapshot().currentRound?.roundNumber).toBe(2);
  engine.stop();
});
