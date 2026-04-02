import test from "node:test";
import assert from "node:assert/strict";

let nextLastError;
let getImpl;
let setImpl;
let removeImpl;

function resetChromeMock() {
  nextLastError = undefined;
  getImpl = function (keys, callback) {
    callback({ requestedKeys: keys });
  };
  setImpl = function (_items, callback) {
    callback();
  };
  removeImpl = function (_keys, callback) {
    callback();
  };
}

resetChromeMock();

Object.assign(globalThis, {
  chrome: {
    storage: {
      local: {
        get(keys, callback) {
          getImpl(keys, callback);
        },
        set(items, callback) {
          setImpl(items, callback);
        },
        remove(keys, callback) {
          removeImpl(keys, callback);
        },
      },
    },
    runtime: {
      get lastError() {
        return nextLastError;
      },
    },
  },
});

const { storageGet, storageRemove, storageSet } =
  await import("../src/storage.js");

test.beforeEach(function () {
  resetChromeMock();
});

test("storageGet resolves returned items", async function () {
  await assert.doesNotReject(async function () {
    const result = await storageGet(["bookmark"]);
    assert.deepEqual(result, { requestedKeys: ["bookmark"] });
  });
});

test("storageSet resolves after the chrome callback fires", async function () {
  let captured;
  setImpl = function (items, callback) {
    captured = items;
    callback();
  };

  await storageSet({ hello: "vault" });
  assert.deepEqual(captured, { hello: "vault" });
});

test("storageRemove resolves after the chrome callback fires", async function () {
  let captured;
  removeImpl = function (keys, callback) {
    captured = keys;
    callback();
  };

  await storageRemove(["bookmark"]);
  assert.deepEqual(captured, ["bookmark"]);
});

test("storage helpers reject when chrome.runtime.lastError is set", async function () {
  nextLastError = new Error("storage exploded");

  await assert.rejects(function () {
    return storageGet(["bookmark"]);
  });

  await assert.rejects(function () {
    return storageSet({ hello: "vault" });
  });

  await assert.rejects(function () {
    return storageRemove(["bookmark"]);
  });
});
