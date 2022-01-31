export function format_cycles_trillion(cycles: bigint) {
  const trillion = 1000000000000;
  const cyclesInTrillion = parseFloat(cycles.toString()) / trillion;
  const cycles_string =
    cyclesInTrillion % 1 === 0 ? cyclesInTrillion : cyclesInTrillion.toFixed(2);
  return cycles_string.toLocaleString() + " " + "TC";
}

export function format_cycles_and_suffix(cycles: bigint) {
  const cycles_float = parseFloat(cycles.toString());
  const SUFFIX_LIST = " KMGT";
  const suffix =
    SUFFIX_LIST[Math.min(4, Math.floor(Math.log10(cycles_float) / 3))];
  const ll = SUFFIX_LIST.indexOf(suffix);
  const humanCycles = Math.floor(cycles_float / 10 ** (ll * 3));
  return [humanCycles.toString(), suffix];
}
