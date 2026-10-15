import { ApiResponseError, HttpRequestError, retryRequest } from "./retry";

describe("retryRequest", () => {
  it("uses deterministic exponential backoff before succeeding", async () => {
    const result = { ok: true };
    const request = jest
      .fn<Promise<typeof result>, []>()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockRejectedValueOnce(new HttpRequestError("Server error", 503))
      .mockResolvedValueOnce(result);
    const wait = jest.fn(async () => undefined);

    await expect(retryRequest(request, { wait })).resolves.toBe(result);
    expect(request).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenNthCalledWith(1, 500, undefined);
    expect(wait).toHaveBeenNthCalledWith(2, 1_000, undefined);
  });

  it.each([400, 401, 403, 404])("does not retry HTTP %s", async (status) => {
    const error = new HttpRequestError("Client error", status);
    const request = jest.fn(async () => {
      throw error;
    });
    const wait = jest.fn(async () => undefined);

    await expect(retryRequest(request, { wait })).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("does not retry invalid response data", async () => {
    const error = new ApiResponseError("Invalid response");
    const request = jest.fn(async () => {
      throw error;
    });

    await expect(retryRequest(request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("stops an exponential-backoff wait when aborted", async () => {
    const controller = new AbortController();
    const request = jest.fn(async () => {
      throw new Error("network unavailable");
    });
    const pending = retryRequest(request, { signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
