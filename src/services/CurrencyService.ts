export class CurrencyService {
  async convertPrice(price: number, currency: string): Promise<number> {
    //Eine fake Konvertierung
    const conversionRate = currency === 'USD' ? 1.1 : 1;
    return price * conversionRate;
  }
}
