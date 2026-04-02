import test from "node:test";
import assert from "node:assert/strict";

import {
  clamp,
  createLabel,
  fingerprintRawText,
  fingerprintText,
  normalizeInteger,
  normalizeText,
  truncateRawText,
  truncateText,
  uniqueElements,
  uniqueStrings,
} from "../src/text.js";

test("normalizeText collapses whitespace and trims ends", function () {
  assert.equal(normalizeText("  hello   world  "), "hello world");
});

test("createLabel falls back and truncates long labels", function () {
  assert.equal(createLabel(""), "Bookmark");
  assert.equal(createLabel("x".repeat(90)).length, 80);
});

test("truncateText and truncateRawText preserve the expected output shape", function () {
  assert.equal(truncateText("alpha beta gamma", 11), "alpha beta…");
  assert.equal(truncateRawText("alpha    beta", 8), "alpha  …");
});

test("fingerprint functions stay stable for known samples", function () {
  assert.equal(fingerprintText("Hello World"), "11:1n91413");
  assert.equal(
    fingerprintRawText("https://chatgpt.com/c/abc-123-def"),
    "33:1s5z8pk",
  );
});

test("utility helpers keep numeric and uniqueness contracts", function () {
  assert.equal(clamp(120, 0, 100), 100);
  assert.equal(normalizeInteger(3), 3);
  assert.equal(normalizeInteger(3.5), -1);
  assert.deepEqual(uniqueElements(["a", "b", "a"]), ["a", "b"]);
  assert.deepEqual(uniqueStrings(["a", "", "b", "a", null]), ["a", "b"]);
});
