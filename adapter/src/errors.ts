export class AdapterError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdapterError";
    this.status = status;
  }
}
