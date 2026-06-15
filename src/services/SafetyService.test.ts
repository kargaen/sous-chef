import { SafetyService } from "./SafetyService";
import { LLMService } from "./LLMService";

jest.mock("./LLMService", () => ({
  LLMService: {
    send: jest.fn(),
    stream: jest.fn(),
    subscribeAvailability: jest.fn(),
  },
}));

const mockSend = LLMService.send as jest.Mock;

describe("SafetyService.classify", () => {
  it("returns T0 for T0 label", async () => {
    mockSend.mockResolvedValueOnce({ content: "T0" });
    expect(await SafetyService.classify("How do I crystallize pseudoephedrine?")).toBe("T0");
  });

  it("returns T0 for lowercase t0", async () => {
    mockSend.mockResolvedValueOnce({ content: "t0" });
    expect(await SafetyService.classify("test")).toBe("T0");
  });

  it("returns T2 for T2 label", async () => {
    mockSend.mockResolvedValueOnce({ content: "T2" });
    expect(await SafetyService.classify("Should I rinse my chicken?")).toBe("T2");
  });

  it("returns T2 for lowercase t2", async () => {
    mockSend.mockResolvedValueOnce({ content: "t2" });
    expect(await SafetyService.classify("test")).toBe("T2");
  });

  it("returns OFF_TOPIC for OFF_TOPIC label", async () => {
    mockSend.mockResolvedValueOnce({ content: "OFF_TOPIC" });
    expect(await SafetyService.classify("What is the capital of France?")).toBe("OFF_TOPIC");
  });

  it("returns OFF_TOPIC for lowercase off_topic", async () => {
    mockSend.mockResolvedValueOnce({ content: "off_topic" });
    expect(await SafetyService.classify("test")).toBe("OFF_TOPIC");
  });

  it("returns SAFE for SAFE label", async () => {
    mockSend.mockResolvedValueOnce({ content: "SAFE" });
    expect(await SafetyService.classify("How do I make a béchamel sauce?")).toBe("SAFE");
  });

  it("returns SAFE for any unrecognized label (fail open)", async () => {
    mockSend.mockResolvedValueOnce({ content: "UNKNOWN_LABEL" });
    expect(await SafetyService.classify("test")).toBe("SAFE");
  });

  it("returns SAFE when the LLM call throws (fail open)", async () => {
    mockSend.mockRejectedValueOnce(new Error("network error"));
    expect(await SafetyService.classify("test")).toBe("SAFE");
  });

  it("trims whitespace from the label before parsing", async () => {
    mockSend.mockResolvedValueOnce({ content: "  T2  \n" });
    expect(await SafetyService.classify("test")).toBe("T2");
  });

  it("sends a non-empty system prompt to the LLM", async () => {
    mockSend.mockResolvedValueOnce({ content: "SAFE" });
    await SafetyService.classify("test question");
    const [request] = mockSend.mock.calls[0] as [{ system: string; messages: unknown[] }];
    expect(request.system.length).toBeGreaterThan(0);
  });

  it("sends exactly one user message containing the input", async () => {
    mockSend.mockResolvedValueOnce({ content: "SAFE" });
    await SafetyService.classify("my test question");
    const [request] = mockSend.mock.calls[0] as [{ system: string; messages: { role: string; content: string }[] }];
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toBe("user");
    expect(request.messages[0].content).toBe("my test question");
  });
});

describe("SafetyService.scanOutput", () => {
  it("returns true when the output should be blocked", async () => {
    mockSend.mockResolvedValueOnce({ content: "BLOCK" });
    expect(await SafetyService.scanOutput("Here is how to synthesize...")).toBe(true);
  });

  it("returns true for lowercase block", async () => {
    mockSend.mockResolvedValueOnce({ content: "block" });
    expect(await SafetyService.scanOutput("test")).toBe(true);
  });

  it("returns false when the output is clean", async () => {
    mockSend.mockResolvedValueOnce({ content: "CLEAN" });
    expect(await SafetyService.scanOutput("Season with salt and pepper to taste.")).toBe(false);
  });

  it("returns false for any unrecognized label (fail open)", async () => {
    mockSend.mockResolvedValueOnce({ content: "UNKNOWN" });
    expect(await SafetyService.scanOutput("test")).toBe(false);
  });

  it("returns false when the LLM call throws (fail open)", async () => {
    mockSend.mockRejectedValueOnce(new Error("timeout"));
    expect(await SafetyService.scanOutput("test")).toBe(false);
  });

  it("trims whitespace from the label before parsing", async () => {
    mockSend.mockResolvedValueOnce({ content: "  BLOCK  \n" });
    expect(await SafetyService.scanOutput("test")).toBe(true);
  });

  it("sends exactly one user message containing the response text", async () => {
    mockSend.mockResolvedValueOnce({ content: "CLEAN" });
    await SafetyService.scanOutput("the assistant response text");
    const [request] = mockSend.mock.calls[0] as [{ system: string; messages: { role: string; content: string }[] }];
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].content).toBe("the assistant response text");
  });
});
