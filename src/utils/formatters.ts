export const formatarData = (data: string | null | undefined): string => {
  if (!data) return "—";
  // Já está em DD/MM/AAAA — retornar direto
  if (data.includes("/")) return data;
  // Converter AAAA-MM-DD → DD/MM/AAAA
  const partes = data.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return data;
};

export const mesParaDate = (mesAno: string | null | undefined): string | null => {
  if (!mesAno) return null;
  const p = mesAno.split("/");
  if (p.length !== 2) return null;
  return `${p[1]}-${p[0].padStart(2, "0")}-01`;
};
