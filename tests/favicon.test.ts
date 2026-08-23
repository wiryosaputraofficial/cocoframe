import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { buildProject, serveProjectAsset } from "../packages/cli/src/project.ts";

test("serves the CocoFrame logo as a valid multi-size favicon", async () => {
  const project = path.resolve("examples/basic");
  await buildProject(project, true);

  const response = await serveProjectAsset(new Request("http://localhost/favicon.ico"), project);
  assert.equal(response?.status, 200);
  assert.equal(response?.headers.get("content-type"), "image/x-icon");

  const bytes = new Uint8Array(await response!.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 6)], [0, 0, 1, 0, 6, 0]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sizes: number[] = [];
  for (let index = 0; index < 6; index++) {
    const entry = 6 + index * 16;
    sizes.push(bytes[entry] === 0 ? 256 : bytes[entry]!);
    const length = view.getUint32(entry + 8, true);
    const offset = view.getUint32(entry + 12, true);
    assert.ok(length > 0);
    assert.deepEqual([...bytes.slice(offset, offset + 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  assert.deepEqual(sizes, [16, 32, 48, 64, 128, 256]);
});
