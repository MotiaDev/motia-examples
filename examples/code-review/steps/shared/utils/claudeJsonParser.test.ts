import { extractJson, runExtractJsonTests, testCases } from './claudeJsonParser';

describe('Claude JSON Parser', () => {
  test('should extract JSON from markdown code blocks', () => {
    const result = extractJson(testCases.markdownCodeBlock.input);
    expect(result).toEqual(testCases.markdownCodeBlock.expected);
  });

  test('should extract JSON from markdown code blocks without language specification', () => {
    const result = extractJson(testCases.markdownCodeBlockNoLanguage.input);
    expect(result).toEqual(testCases.markdownCodeBlockNoLanguage.expected);
  });

  test('should parse direct JSON', () => {
    const result = extractJson(testCases.directJson.input);
    expect(result).toEqual(testCases.directJson.expected);
  });

  test('should extract JSON with text before it', () => {
    const result = extractJson(testCases.jsonWithTextBefore.input);
    expect(result).toEqual(testCases.jsonWithTextBefore.expected);
  });

  test('should extract JSON with text after it', () => {
    const result = extractJson(testCases.jsonWithTextAfter.input);
    expect(result).toEqual(testCases.jsonWithTextAfter.expected);
  });

  test('should extract complex nested JSON', () => {
    const result = extractJson(testCases.complexJson.input);
    expect(result).toEqual(testCases.complexJson.expected);
  });

  test('should handle Claude CLI JSON format', () => {
    const input = testCases.claudeCliJson.input;
    // First extract the Claude CLI output format
    const cliOutput = JSON.parse(input);
    // Then extract from the result field which contains Claude's actual response
    const result = extractJson(cliOutput.result);
    expect(result).toEqual(testCases.claudeCliJson.expected);
  });

  test('should handle newline escaped JSON from Claude CLI', () => {
    const input = '{"cost_usd": 0.01, "result": "```json\\n{\\"items\\": [1, 2, 3]}\\n```"}';
    const cliOutput = JSON.parse(input);
    const result = extractJson(cliOutput.result);
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  test('should throw error for invalid input', () => {
    expect(() => extractJson('')).toThrow('Empty response');
    expect(() => extractJson('Not JSON at all')).toThrow('Failed to extract valid JSON');
  });

  test('should run all test cases successfully', () => {
    const { success, results } = runExtractJsonTests();
    expect(success).toBe(true);
    results.forEach(result => {
      expect(result.passed).toBe(true);
    });
  });
}); 