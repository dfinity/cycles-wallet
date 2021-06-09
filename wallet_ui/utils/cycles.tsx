export function format_cycles(cycles : bigint) {
  const [cycles_string, suffix] = format_cycles_and_suffix(cycles);
  return cycles_string + " " + suffix + "C";
}

export function format_cycles_and_suffix(cycles : bigint) {
  const cycles_float = parseFloat(cycles.toString());
  const SUFFIX_LIST = " KMGTPE";
  const suffix = SUFFIX_LIST[Math.min(6, Math.floor(Math.log10(cycles_float) / 3))];
  const ll = SUFFIX_LIST.indexOf(suffix);
  const humanCycles = Math.floor(cycles_float / 10 ** (ll * 3));
  return [humanCycles.toString(), suffix];
}  
