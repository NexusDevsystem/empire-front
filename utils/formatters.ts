
export const numberToExtenso = (value: number): string => {
    if (value === 0) return 'zero reais';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezAvinte = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const convertGroup = (n: number): string => {
        if (n === 100) return 'cem';
        let str = '';
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (c > 0) str += centenas[c];

        if (d > 0 || u > 0) {
            if (str !== '') str += ' e ';
            if (d < 1) {
                str += unidades[u];
            } else if (d === 1) {
                str += dezAvinte[u];
            } else {
                str += dezenas[d];
                if (u > 0) str += ' e ' + unidades[u];
            }
        }
        return str;
    }

    // Basic implementation for values up to 999,999.99
    // This is a simplified version. For a production financial system, a specialized library like 'extenso' is recommended.
    // However, to keep it zero-dep for now:

    const integerPart = Math.floor(value);
    const decimalPart = Math.round((value - integerPart) * 100);

    let result = '';

    if (integerPart > 0) {
        if (integerPart >= 1000) {
            const mil = Math.floor(integerPart / 1000);
            const resto = integerPart % 1000;
            result += (mil === 1 ? 'mil' : convertGroup(mil) + ' mil');
            if (resto > 0) {
                if (resto < 100 || resto % 100 === 0) result += ' e ';
                else result += ', ';
                result += convertGroup(resto);
            }
        } else {
            result += convertGroup(integerPart);
        }
        result += integerPart === 1 ? ' real' : ' reais';
    }

    if (decimalPart > 0) {
        if (result !== '') result += ' e ';
        result += convertGroup(decimalPart);
        result += decimalPart === 1 ? ' centavo' : ' centavos';
    }

    return result;
};

export const formatCPFCNPJ = (value: string): string => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 11) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
