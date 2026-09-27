declare const console: { debug: (message: string) => void } | undefined;

let enabled = false;

export const setTracing = (value: boolean) => {
  enabled = value;
};

export const trace = (message: () => string) => {
  if (enabled && typeof console !== "undefined") {
    console.debug(message());
  }
};
