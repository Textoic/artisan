import assert from "node:assert/strict";
import { describe, it } from "node:test";
import predict from "../../src/tag/predict.js";

describe("predict", () => {
  it("some features and all labels", () => {
    assert.equal(
      predict(
        {
          x: { a: 0.4, b: 0.6, c: 1 },
          y: { a: 0.8, b: -0.4, c: 1 },
          z: { a: -1, b: 0.2, c: -1 },
        },
        { x: 1, y: 1 },
        ["a", "b", "c"],
      ),
      "c",
    );
  });

  it("all features and some labels", () => {
    assert.equal(
      predict(
        {
          x: { a: 0.4, b: 0.6, c: 1 },
          y: { a: 0.8, b: -0.4, c: 1 },
          z: { a: -1, b: 0.2, c: -1 },
        },
        { x: 1, y: 1, z: 1 },
        ["a", "b"],
      ),
      "b",
    );
  });

  it("some feature and some labels", () => {
    assert.equal(
      predict(
        {
          x: { a: 0.4, b: 0.6, c: 1 },
          y: { b: -0.4, c: 1 },
          z: { a: -1, c: -1 },
        },
        { x: 1, y: 1 },
        ["a", "b"],
      ),
      "a",
    );
  });

  it("some weights, some features and some labels", () => {
    assert.equal(
      predict(
        {
          y: { a: 0, b: 1, c: 2 },
        },
        { x: 1, y: 1 },
        ["a", "c"],
      ),
      "c",
    );
  });
});
