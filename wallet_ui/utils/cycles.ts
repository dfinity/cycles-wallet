export function format_cycles_trillion(cycles: bigint, fixed: number) {
  const trillion = 1000000000000;
  const cyclesInTrillion = parseFloat(cycles.toString()) / trillion;
  const cycles_string =
    cyclesInTrillion % 1 === 0
      ? cyclesInTrillion
      : cyclesInTrillion.toFixed(fixed);
  return cycles_string.toLocaleString();
}

export function format_cycles_trillion_fullrange(cycles: bigint) {
  const cycles_float = parseFloat(cycles.toString());
  const units = {
    kilo: 1000,
    mega: 1000000,
    giga: 1000000000,
    tril: 1000000000000,
  };
  if (cycles_float < units.kilo) {
    return format_cycles_trillion(cycles, 12);
  }
  if (cycles_float < units.mega) {
    return format_cycles_trillion(cycles, 9);
  }
  if (cycles_float < units.giga) {
    return format_cycles_trillion(cycles, 6);
  }
  if (cycles_float < units.tril) {
    return format_cycles_trillion(cycles, 3);
  }
  return format_cycles_trillion(cycles, 2);
}
