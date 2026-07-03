import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDocxConvertExecutor,
  markdownToDocxBuffer,
  type DocxExecutorAdapter,
} from '../executor/docx-executor.js';

describe('docx executor', () => {
  it('builds a non-empty DOCX buffer from markdown', () => {
    const buffer = markdownToDocxBuffer('# Title\n\n- item');
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  });

  it('returns cancelled output when user cancels save dialog', async () => {
    const adapter: DocxExecutorAdapter = {
      async askSavePath() {
        return null;
      },
      async writeWithPermissionFallback() {
        throw new Error('should not be called');
      },
    };

    const executor = createDocxConvertExecutor(adapter);
    const result = await executor.execute(
      { markdown: '# hello', defaultFileName: 'test' },
      { requestId: 'req-docx-cancel', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
  });

  it('returns success output after writing docx file', async () => {
    let wroteBuffer = false;
    const adapter: DocxExecutorAdapter = {
      async askSavePath() {
        return '/tmp/answer.docx';
      },
      async writeWithPermissionFallback(_path, buffer) {
        wroteBuffer = buffer.length > 0;
        return {
          filePath: '/tmp/answer.docx',
          fallbackUsed: false,
        };
      },
    };

    const executor = createDocxConvertExecutor(adapter);
    const result = await executor.execute(
      { markdown: 'plain text' },
      { requestId: 'req-docx-success', workspaceRoot: process.cwd() },
    );

    assert.equal(wroteBuffer, true);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.filePath, '/tmp/answer.docx');
      assert.equal(result.fallbackUsed, false);
    }
  });
});