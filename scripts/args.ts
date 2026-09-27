export const optionReader =
  (args: string[]) =>
  (name: string): string | undefined =>
    args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
