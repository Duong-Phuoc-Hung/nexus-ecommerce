import units from './vietnam-administrative-units.json';

export type Ward = { code: string; name: string };
export type Province = { code: string; name: string; wards: Ward[] };

export const locationDatasetVersion = units.version;
export const provinces: Province[] = units.provinces;

export function provinceByCode(code: string) {
  return provinces.find((province) => province.code === code);
}

export function provinceCodeForName(name: string) {
  return provinces.find((province) => province.name === name)?.code ?? '';
}

export function wardCodeForName(provinceCode: string, name: string) {
  return provinceByCode(provinceCode)?.wards.find((ward) => ward.name === name)?.code ?? '';
}
