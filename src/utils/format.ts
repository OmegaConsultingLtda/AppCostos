export const formatCurrency = (amount: number, currency = 'CLP') => {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

export const formatYmdToDmy = (ymdString: string) => {
    if (!ymdString || !ymdString.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
    const [year, month, day] = ymdString.split('-');
    return `${day}/${month}/${year}`;
};
