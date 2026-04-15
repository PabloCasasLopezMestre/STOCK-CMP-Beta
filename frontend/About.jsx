import React, { useState } from 'react';

const TABS = ['diccionario', 'funcionamiento', 'funciones', 'codigos', 'nosotros'];

function Section({ title, children, query }) {
  const filtered = React.Children.toArray(children).filter(child => {
    if (!query) return true;
    const q = query.toLowerCase();
    const term = (child.props?.term || '').toString().toLowerCase();
    const desc = (child.props?.children || '').toString().toLowerCase();
    return term.includes(q) || desc.includes(q);
  });
  if (filtered.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-blue-400 text-lg font-bold mb-4 border-b border-slate-700 pb-2">{title}</h2>
      <div className="space-y-3">{filtered}</div>
    </div>
  );
}

const Term = ({ term, children }) => (
  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
    <p className="text-white font-semibold mb-1">{term}</p>
    <p className="text-slate-300 text-sm leading-relaxed">{children}</p>
  </div>
);

export default function About({ lang = 'es' }) {
  const en = lang !== 'es';
  const s = (es, enText) => en ? enText : es;
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('diccionario');

  const tabLabels = {
    diccionario: s('Diccionario', 'Dictionary'),
    funcionamiento: s('Funcionamiento', 'How It Works'),
    funciones: s('Funciones', 'Features'),
    codigos: s('Códigos', 'Symbol Codes'),
    nosotros: s('Nosotros', 'About Us'),
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ── TABS ── */}
      <div className="flex gap-2 mb-8 border-b border-slate-700">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-slate-800 text-blue-400 border border-b-0 border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* ── DICCIONARIO ── */}
      {activeTab === 'diccionario' && (
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{s('Diccionario de Valores', 'Stock Dictionary')}</h1>
            <p className="text-slate-400 mb-4">{s('Guía de referencia para todos los datos que aparecen en el Comparador y el Portafolio.', 'Reference guide for all data shown in the Comparator and Portfolio.')}</p>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={s('Buscar concepto…', 'Search concept…')}
              className="w-full bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
            />
          </div>

      {/* ── COMPARADOR ── */}
      <Section query={query} title={s('Comparador — Precios y variación', 'Comparator — Prices & Change')}>
        <Term term={s('Precio Actual', 'Current Price')}>
          {s('El último precio de cierre registrado para la acción en el mercado. Es el precio al que se negoció la acción en la última operación del día.', 'The last recorded closing price for the stock. The price at which the stock traded in the last transaction of the day.')}
        </Term>
        <Term term={s('Promedio', 'Average')}>
          {s('El precio promedio de la acción durante el período de tiempo seleccionado (1 hora, 1 mes, 1 año, etc.).', 'The average stock price over the selected time period (1 hour, 1 month, 1 year, etc.).')}
        </Term>
        <Term term={s('Cambio %', 'Change %')}>
          {s('La variación porcentual del precio entre el primer y el último dato del período seleccionado. Positivo = subió, negativo = bajó.', 'The percentage change between the first and last data point of the selected period. Positive = up, negative = down.')}
        </Term>
        <Term term={s('Mín / Máx del período', 'Period Min / Max')}>
          {s('El precio más bajo y más alto registrado durante el período de tiempo seleccionado en la gráfica.', 'The lowest and highest price recorded during the selected time period in the chart.')}
        </Term>
        <Term term={s('Apertura', 'Open')}>
          {s('El precio al que abrió la acción al inicio de la sesión de trading del día actual.', 'The price at which the stock opened at the start of the current trading session.')}
        </Term>
        <Term term={s('Máx. día / Mín. día', 'Day High / Day Low')}>
          {s('El precio más alto y más bajo que alcanzó la acción durante la sesión de trading del día actual.', 'The highest and lowest price reached during the current trading session.')}
        </Term>
        <Term term={s('Máx. 52S / Mín. 52S', '52W High / 52W Low')}>
          {s('El precio más alto y más bajo que ha tenido la acción en los últimos 52 semanas (1 año). Son referencias importantes para evaluar si la acción está cara o barata históricamente.', 'The highest and lowest price over the past 52 weeks (1 year). Key references for evaluating whether a stock is historically expensive or cheap.')}
        </Term>
        <Term term={s('Vol. (Volumen)', 'Vol. (Volume)')}>
          {s('El número total de acciones que se han comprado y vendido durante la sesión del día. Un volumen alto indica mucho interés en la acción.', 'The total number of shares bought and sold during the trading session. High volume indicates strong interest in the stock.')}
        </Term>
        <Term term={s('V. medio (Volumen promedio)', 'Avg. Vol. (Average Volume)')}>
          {s('El promedio de acciones negociadas por día en los últimos 3 meses. Sirve para comparar si el volumen actual es inusualmente alto o bajo.', 'The average number of shares traded per day over the past 3 months. Used to compare whether current volume is unusually high or low.')}
        </Term>
        <Term term={s('Cap. merc. (Capitalización de mercado)', 'Mkt. Cap. (Market Capitalization)')}>
          {s('El valor total de la empresa en el mercado. Se calcula multiplicando el precio de la acción por el número total de acciones. Ejemplo: si una acción vale $100 y hay 1,000 millones de acciones, la capitalización es $100,000 millones.', 'The total market value of the company. Calculated by multiplying the stock price by the total number of shares. Example: if a stock is $100 and there are 1 billion shares, the market cap is $100 billion.')}
        </Term>
      </Section>

      <Section query={query} title={s('Comparador — Datos Fundamentales', 'Comparator — Fundamental Data')}>
        <Term term="P/E (TTM)">
          {s('Indica cuántos años de beneficios estás pagando al comprar la acción hoy. Un P/E de 20 significa que pagas 20 veces las ganancias anuales. Un P/E alto puede indicar expectativas de crecimiento; uno bajo puede indicar que la acción está barata o que la empresa tiene problemas.', 'Indicates how many years of earnings you are paying when buying the stock today. A P/E of 20 means you pay 20 times annual earnings. A high P/E may indicate growth expectations; a low one may indicate the stock is cheap or the company has issues.')}
        </Term>
        <Term term="P/E Fwd (Forward P/E)">
          {s('Similar al P/E, pero usando las ganancias estimadas para el próximo año en lugar de las del año pasado. Refleja las expectativas del mercado sobre el futuro de la empresa.', 'Similar to P/E, but using estimated earnings for the next year instead of the past year. Reflects market expectations about the company\'s future.')}
        </Term>
        <Term term="P/B (Price / Book)">
          {s('Compara el precio de mercado con el valor contable de la empresa (lo que posee físicamente menos lo que debe). Un valor menor a 1 puede indicar que la acción cotiza por debajo de su valor real en libros.', 'Compares the market price with the book value of the company (what it physically owns minus what it owes). A value below 1 may indicate the stock trades below its book value.')}
        </Term>
        <Term term="P/S (Price / Sales)">
          {s('Compara el precio de la acción con los ingresos por ventas de la empresa. Útil para empresas que aún no tienen ganancias pero sí generan ingresos.', 'Compares the stock price with the company\'s sales revenue. Useful for companies that don\'t yet have earnings but do generate revenue.')}
        </Term>
        <Term term="EPS (TTM)">
          {s('El beneficio neto de la empresa dividido entre el número total de acciones. Debe ser creciente con el tiempo; si cae, puede ser señal de que la empresa está perdiendo rentabilidad.', 'The company\'s net profit divided by the total number of shares. Should grow over time; if it falls, it may signal the company is losing profitability.')}
        </Term>
        <Term term="EPS Fwd (Forward EPS)">
          {s('Las ganancias por acción estimadas para el próximo año. Refleja las expectativas de los analistas sobre la rentabilidad futura.', 'Estimated earnings per share for the next year. Reflects analyst expectations about future profitability.')}
        </Term>
        <Term term="Div. Yield">
          {s('El porcentaje de rentabilidad extra que recibes en efectivo cada año por ser dueño de la acción. Un Div. Yield de 3% significa que por cada $100 invertidos recibes $3 al año en dividendos.', 'The extra cash return you receive each year for owning the stock. A 3% Div. Yield means for every $100 invested you receive $3 per year in dividends.')}
        </Term>
        <Term term="Beta">
          {s('Mide la volatilidad de la acción comparada con el mercado general (S&P 500). Beta mayor a 1 = más volátil que el mercado. Beta menor a 1 = más estable. Ejemplo: Beta de 1.5 significa que si el mercado sube 10%, la acción tiende a subir 15%.', 'Measures the stock\'s volatility compared to the overall market (S&P 500). Beta > 1 = more volatile than the market. Beta < 1 = more stable. Example: Beta of 1.5 means if the market rises 10%, the stock tends to rise 15%.')}
        </Term>
      </Section>

      <Section query={query} title={s('Comparador — Rangos de tiempo', 'Comparator — Time Ranges')}>
        <Term term={s('1 Hora / 6 Horas / 24 Horas', '1 Hour / 6 Hours / 24 Hours')}>
          {s('Datos intradía. El eje X muestra la hora (HH:MM). Útil para ver movimientos del día actual.', 'Intraday data. The X axis shows the time (HH:MM). Useful for viewing movements during the current day.')}
        </Term>
        <Term term={s('1 Semana / 1 Mes / 3 Meses / 6 Meses', '1 Week / 1 Month / 3 Months / 6 Months')}>
          {s('Datos históricos de corto a mediano plazo. El eje X muestra la fecha.', 'Short to medium-term historical data. The X axis shows the date.')}
        </Term>
        <Term term={s('1 Año / 2 Años / 3 Años / 5 Años / 10 Años / 15 Años', '1 Year / 2 Years / 3 Years / 5 Years / 10 Years / 15 Years')}>
          {s('Datos históricos de largo plazo. Útil para evaluar tendencias y el desempeño histórico de la empresa.', 'Long-term historical data. Useful for evaluating trends and the company\'s historical performance.')}
        </Term>
        <Term term={s('Hora ET / Hora CDMX', 'ET Time / CDMX Time')}>
          {s('ET = Hora del Este de EE.UU., zona horaria de la Bolsa de Nueva York (NYSE). El mercado abre a las 9:30 AM ET y cierra a las 4:00 PM ET. CDMX normalmente es 1 hora menos que ET.', 'ET = US Eastern Time, the time zone of the New York Stock Exchange (NYSE). The market opens at 9:30 AM ET and closes at 4:00 PM ET. CDMX is normally 1 hour behind ET.')}
        </Term>
      </Section>

      {/* ── PORTAFOLIO ── */}
      <Section query={query} title={s('Portafolio — Gráficas', 'Portfolio — Charts')}>
        <Term term={s('Gráfica del Portafolio', 'Portfolio Chart')}>
          {s('Muestra la evolución del precio de cada acción que tienes en tu portafolio a lo largo del tiempo. Solo aparece cuando tienes al menos una acción comprada (posición abierta).', 'Shows the price evolution of each stock in your portfolio over time. Only appears when you have at least one stock purchased (open position).')}
        </Term>
        <Term term={s('Gráfica de Valor Total del Portafolio', 'Total Portfolio Value Chart')}>
          {s('Muestra cómo ha crecido o disminuido el valor total de tu portafolio desde la primera transacción. Solo aparece cuando tienes al menos una transacción registrada — ya sea un depósito, compra, venta o dividendo.', 'Shows how the total value of your portfolio has grown or decreased since the first transaction. Only appears when you have at least one recorded transaction — deposit, buy, sell, or dividend.')}
        </Term>
        <Term term={s('¿Se guardan mis datos?', 'Is my data saved?')}>
          {s('Sí. El portafolio se sincroniza automáticamente con Supabase para que persista entre dispositivos y sesiones. Si no tienes sesión o Supabase no está disponible, se usa localStorage como respaldo.', 'Yes. The portfolio automatically syncs with Supabase so it persists across devices and sessions. If you have no session or Supabase is unavailable, localStorage is used as a fallback.')}
        </Term>
      </Section>

      <Section query={query} title={s('Portafolio — Resumen', 'Portfolio — Summary')}>
        <Term term={s('Valor Total', 'Total Value')}>
          {s('La suma del efectivo disponible más el valor actual de todas tus acciones a precios de mercado.', 'The sum of available cash plus the current value of all your stocks at market prices.')}
        </Term>
        <Term term={s('Efectivo', 'Cash')}>
          {s('El dinero en tu cuenta que no está invertido en acciones. Disponible para comprar más acciones.', 'The money in your account that is not invested in stocks. Available to buy more shares.')}
        </Term>
        <Term term={s('Inversiones', 'Investments')}>
          {s('El valor actual de todas tus acciones calculado con los precios de mercado más recientes.', 'The current value of all your stocks calculated using the most recent market prices.')}
        </Term>
        <Term term={s('Retorno Total', 'Total Return')}>
          {s('La diferencia entre el valor actual de tu portafolio y el dinero neto que has depositado. Incluye ganancias/pérdidas no realizadas y dividendos recibidos.', 'The difference between the current value of your portfolio and the net money you have deposited. Includes unrealized gains/losses and dividends received.')}
        </Term>
      </Section>

      <Section query={query} title={s('Portafolio — Ganancias', 'Portfolio — Gains')}>
        <Term term={s('Ganancias por Dividendos', 'Dividend Gains')}>
          {s('El total acumulado de dividendos que has recibido desde que empezaste a usar el simulador.', 'The total accumulated dividends you have received since you started using the simulator.')}
        </Term>
        <Term term={s('Ganancia por Valor de Acciones', 'Stock Value Gain')}>
          {s('La diferencia entre el precio actual de tus acciones y el precio promedio al que las compraste (costo promedio). Puede ser positiva (ganancia no realizada) o negativa (pérdida no realizada).', 'The difference between the current price of your stocks and the average price you paid (average cost). Can be positive (unrealized gain) or negative (unrealized loss).')}
        </Term>
        <Term term={s('Ganancia Total', 'Total Gain')}>
          {s('La suma de las ganancias por dividendos más las ganancias por valor de acciones.', 'The sum of dividend gains plus stock value gains.')}
        </Term>
      </Section>

      <Section query={query} title={s('Portafolio — Posiciones', 'Portfolio — Positions')}>
        <Term term={s('Comprado a (Costo promedio)', 'Avg. Cost (Average Cost)')}>
          {s('El precio promedio al que compraste todas tus acciones de ese símbolo. Si compraste en diferentes momentos, es el promedio ponderado.', 'The average price at which you bought all your shares of that symbol. If you bought at different times, it is the weighted average.')}
        </Term>
        <Term term={s('Precio hace X período', 'Price X period ago')}>
          {s('El precio de la acción al inicio del período de comparación seleccionado (1 hora, 1 semana, 1 mes, etc.).', 'The stock price at the start of the selected comparison period (1 hour, 1 week, 1 month, etc.).')}
        </Term>
        <Term term={s('G/P vs compra', 'G/L vs purchase')}>
          {s('Ganancia o pérdida comparando el precio actual con tu costo promedio de compra. Muestra cuánto has ganado o perdido desde que compraste.', 'Gain or loss comparing the current price with your average purchase cost. Shows how much you have gained or lost since you bought.')}
        </Term>
        <Term term={s('G/P en período', 'G/L in period')}>
          {s('Ganancia o pérdida comparando el precio actual con el precio al inicio del período seleccionado. Muestra el rendimiento reciente independientemente de cuándo compraste.', 'Gain or loss comparing the current price with the price at the start of the selected period. Shows recent performance regardless of when you bought.')}
        </Term>
      </Section>

      <Section query={query} title={s('Portafolio — Operaciones', 'Portfolio — Operations')}>
        <Term term={s('Depositar / Retirar', 'Deposit / Withdraw')}>
          {s('Simula agregar o quitar dinero de tu cuenta bancaria virtual. El dinero depositado es el capital disponible para invertir.', 'Simulates adding or removing money from your virtual bank account. Deposited money is the capital available to invest.')}
        </Term>
        <Term term={s('Comprar', 'Buy')}>
          {s('Adquirir acciones de una empresa. El costo total se descuenta de tu efectivo disponible. El precio se obtiene automáticamente de Yahoo Finance.', 'Acquire shares of a company. The total cost is deducted from your available cash. The price is automatically fetched from Yahoo Finance.')}
        </Term>
        <Term term={s('Vender', 'Sell')}>
          {s('Vender acciones que tienes en tu portafolio. El monto se agrega a tu efectivo disponible.', 'Sell shares you hold in your portfolio. The amount is added to your available cash.')}
        </Term>
        <Term term={s('Registrar Dividendo', 'Record Dividend')}>
          {s('Registra el pago de dividendo por acción que recibiste. Se multiplica por el número de acciones que tienes y se agrega a tu efectivo.', 'Records the dividend payment per share you received. It is multiplied by the number of shares you hold and added to your cash.')}
        </Term>
      </Section>

      <Section query={query} title={s('Cuenta de banco virtual', 'Virtual Bank Account')}>
        <Term term={s('¿Qué es la cuenta de banco?', 'What is the bank account?')}>
          {s('Es una cuenta de efectivo simulada dentro del portafolio. Funciona como el saldo disponible en una cuenta de corretaje real: puedes depositar capital, usarlo para comprar acciones y recibir el producto de tus ventas y dividendos.', 'It is a simulated cash account within the portfolio. It works like the available balance in a real brokerage account: you can deposit capital, use it to buy stocks, and receive proceeds from sales and dividends.')}
        </Term>
        <Term term={s('Depósito inicial', 'Initial Deposit')}>
          {s('Para empezar a operar debes hacer al menos un depósito. Este monto se convierte en tu efectivo disponible. Puedes depositar cualquier cantidad y hacerlo varias veces.', 'To start trading you must make at least one deposit. This amount becomes your available cash. You can deposit any amount and do it multiple times.')}
        </Term>
        <Term term={s('Retiro de fondos', 'Withdrawal')}>
          {s('Puedes retirar efectivo de tu cuenta siempre que el saldo disponible sea suficiente. Los retiros reducen tu efectivo pero no afectan las posiciones abiertas en acciones.', 'You can withdraw cash from your account as long as the available balance is sufficient. Withdrawals reduce your cash but do not affect open stock positions.')}
        </Term>
        <Term term={s('Historial de transacciones', 'Transaction History')}>
          {s('Cada depósito, retiro, compra, venta y dividendo queda registrado en el historial de transacciones. Puedes consultarlo en cualquier momento para revisar tu actividad.', 'Every deposit, withdrawal, buy, sell, and dividend is recorded in the transaction history. You can review it at any time to check your activity.')}
        </Term>
        <Term term={s('Saldo insuficiente', 'Insufficient Balance')}>
          {s('Si intentas comprar acciones por un monto mayor a tu efectivo disponible, la operación será rechazada. Asegúrate de tener suficiente saldo antes de ejecutar una compra.', 'If you try to buy stocks for more than your available cash, the operation will be rejected. Make sure you have enough balance before executing a purchase.')}
        </Term>
      </Section>

      <Section query={query} title={s('Dividendos', 'Dividends')}>
        <Term term={s('¿Qué es un dividendo?', 'What is a dividend?')}>
          {s('Un dividendo es un pago que una empresa hace a sus accionistas como distribución de sus ganancias. Se expresa como un monto por acción (ej. $0.50 por acción). No todas las empresas pagan dividendos — las empresas de crecimiento suelen reinvertir sus ganancias en lugar de distribuirlas.', 'A dividend is a payment a company makes to its shareholders as a distribution of its earnings. It is expressed as an amount per share (e.g. $0.50 per share). Not all companies pay dividends — growth companies usually reinvest their earnings instead of distributing them.')}
        </Term>
        <Term term={s('Div. Yield (Rendimiento por dividendo)', 'Div. Yield (Dividend Yield)')}>
          {s('El porcentaje anual que recibes en dividendos respecto al precio actual de la acción. Ejemplo: si la acción vale $100 y paga $3 al año en dividendos, el Div. Yield es 3%. Un yield alto puede ser atractivo, pero también puede indicar que el precio de la acción ha caído mucho.', 'The annual percentage you receive in dividends relative to the current stock price. Example: if the stock is worth $100 and pays $3 per year in dividends, the Div. Yield is 3%. A high yield can be attractive, but may also indicate the stock price has dropped significantly.')}
        </Term>
        <Term term={s('Cómo registrar un dividendo en el simulador', 'How to record a dividend in the simulator')}>
          {s('En el portafolio, usa el botón "Registrar Dividendo" e ingresa el monto por acción que recibiste. El simulador multiplica ese valor por el número de acciones que tienes y lo suma a tu efectivo disponible. Esto refleja cómo funciona en la realidad: el dividendo se acredita directamente en tu cuenta.', 'In the portfolio, use the "Record Dividend" button and enter the amount per share you received. The simulator multiplies that value by the number of shares you hold and adds it to your available cash. This reflects how it works in reality: the dividend is credited directly to your account.')}
        </Term>
        <Term term={s('Dividendos y retorno total', 'Dividends and total return')}>
          {s('Los dividendos recibidos se contabilizan en el "Retorno Total" y en las "Ganancias por Dividendos" del portafolio. Son una parte importante del rendimiento real de una inversión, especialmente en acciones de empresas maduras como utilities, bancos o empresas de consumo básico.', 'Dividends received are counted in the "Total Return" and "Dividend Gains" of the portfolio. They are an important part of the real return on an investment, especially in stocks of mature companies like utilities, banks, or consumer staples.')}
        </Term>
        <Term term={s('Frecuencia de pago', 'Payment Frequency')}>
          {s('Las empresas pueden pagar dividendos de forma trimestral (lo más común en EE.UU.), semestral, anual o incluso mensual. Algunas pagan dividendos especiales de forma extraordinaria. El simulador no automatiza estos pagos — debes registrarlos manualmente cuando los recibas.', 'Companies can pay dividends quarterly (most common in the US), semi-annually, annually, or even monthly. Some pay special one-time dividends. The simulator does not automate these payments — you must record them manually when you receive them.')}
        </Term>
      </Section>

      <Section query={query} title={s('¿Por qué los datos no funcionan con ciertos rangos de tiempo?', 'Why does data not work with certain time ranges?')}>
        <Term term={s('Rangos intradía fuera de horario de mercado', 'Intraday ranges outside market hours')}>
          {s('Los rangos de 1h, 6h y 24h solo tienen datos cuando el mercado está abierto o acaba de cerrar. Si consultas estos rangos en fin de semana, festivos o fuera del horario de la bolsa correspondiente, Yahoo Finance devuelve datos vacíos o muy limitados. Usa rangos de 1 semana o más para ver datos históricos sin esta limitación.', 'The 1h, 6h, and 24h ranges only have data when the market is open or has just closed. If you query these ranges on weekends, holidays, or outside the corresponding exchange hours, Yahoo Finance returns empty or very limited data. Use ranges of 1 week or more to see historical data without this limitation.')}
        </Term>
        <Term term={s('Acciones con historial corto', 'Stocks with short history')}>
          {s('Si una empresa salió a bolsa recientemente (IPO reciente), no tendrá datos para rangos largos como 5 años o 10 años. Yahoo Finance solo devuelve los datos disponibles desde la fecha de cotización.', 'If a company recently went public (recent IPO), it will not have data for long ranges like 5 years or 10 years. Yahoo Finance only returns data available since the listing date.')}
        </Term>
        <Term term={s('Criptomonedas e índices en rangos intradía', 'Cryptocurrencies and indices in intraday ranges')}>
          {s('Las criptomonedas operan 24/7, por lo que los rangos intradía siempre tienen datos. Sin embargo, algunos índices y futuros pueden tener horas de cierre que generan gaps en los datos intradía.', 'Cryptocurrencies trade 24/7, so intraday ranges always have data. However, some indices and futures may have closing hours that create gaps in intraday data.')}
        </Term>
        <Term term={s('Límite de puntos de datos de Yahoo Finance', 'Yahoo Finance data point limit')}>
          {s('Yahoo Finance limita el número de puntos de datos por consulta según el intervalo. Para rangos muy largos (10-15 años) con intervalos diarios, puede devolver datos incompletos o con gaps. Esto es una limitación de la API pública y no de la app.', 'Yahoo Finance limits the number of data points per query depending on the interval. For very long ranges (10-15 years) with daily intervals, it may return incomplete data or gaps. This is a limitation of the public API, not of the app.')}
        </Term>
        <Term term={s('Cambios en la API de Yahoo Finance', 'Yahoo Finance API changes')}>
          {s('Yahoo Finance no tiene una API pública oficial. Ocasionalmente cambia su estructura interna, lo que puede causar que ciertos rangos o símbolos dejen de funcionar temporalmente hasta que se actualice el proxy. Si ves errores persistentes en un rango específico, es probable que sea por esto.', 'Yahoo Finance does not have an official public API. It occasionally changes its internal structure, which can cause certain ranges or symbols to temporarily stop working until the proxy is updated. If you see persistent errors in a specific range, this is likely the cause.')}
        </Term>
        <Term term={s('Bolsas internacionales y zonas horarias', 'International exchanges and time zones')}>
          {s('Los datos intradía de bolsas asiáticas (Tokyo, Hong Kong, Shanghai) o europeas (Frankfurt, Londres) pueden aparecer vacíos si los consultas durante su horario nocturno local. El mercado de Tokyo, por ejemplo, opera de 9:00 a 15:30 JST (UTC+9), lo que equivale a la madrugada en horario ET o CDMX.', 'Intraday data from Asian (Tokyo, Hong Kong, Shanghai) or European (Frankfurt, London) exchanges may appear empty if queried during their local nighttime hours. The Tokyo market, for example, operates from 9:00 to 15:30 JST (UTC+9), which is the early morning in ET or CDMX time.')}
        </Term>
      </Section>

      <Section query={query} title={s('Noticias', 'News')}>
        <Term term={s('Fuente de noticias', 'News source')}>
          {s('Las noticias se obtienen de Finnhub (fuente principal) con fallback a Yahoo Finance RSS. Cubren los últimos 30 días de cobertura periodística sobre la empresa.', 'News is fetched from Finnhub (primary source) with fallback to Yahoo Finance RSS. Covers the last 30 days of press coverage about the company.')}
        </Term>
        <Term term={s('Filtro de tiempo', 'Time filter')}>
          {s('Filtra las noticias por antigüedad: 1 hora, 6 horas, 24 horas, 48 horas, 7 días o todas. El filtro se aplica localmente sobre las noticias ya descargadas.', 'Filters news by age: 1 hour, 6 hours, 24 hours, 48 hours, 7 days, or all. The filter is applied locally on already downloaded news.')}
        </Term>
      </Section>

      <Section query={query} title={s('Fuentes de datos y limitaciones', 'Data Sources & Limitations')}>
        <Term term="Yahoo Finance — Historical Prices">
          {s('Fuente principal para gráficas y precios. Los datos tienen un retraso de ~15 minutos durante el horario de mercado. No es un feed en tiempo real. Fuera del horario de mercado (antes de las 9:30 AM ET y después de las 4:00 PM ET) los precios no se actualizan.', 'Primary source for charts and prices. Data has a ~15-minute delay during market hours. Not a real-time feed. Outside market hours (before 9:30 AM ET and after 4:00 PM ET) prices do not update.')}
        </Term>
        <Term term="Yahoo Finance — Fundamental Data (quoteSummary)">
          {s('Fuente para P/E, Beta, EPS, dividendos, capitalización, etc. Estos datos se actualizan con menor frecuencia que los precios — típicamente una vez al día o cuando la empresa reporta resultados. Requiere autenticación con crumb; si Yahoo cambia su API, estos datos pueden dejar de funcionar temporalmente.', 'Source for P/E, Beta, EPS, dividends, market cap, etc. This data updates less frequently than prices — typically once a day or when the company reports results. Requires crumb authentication; if Yahoo changes its API, this data may temporarily stop working.')}
        </Term>
        <Term term="Finnhub — News">
          {s('Plan gratuito con límite de 60 llamadas por minuto. Las noticias cubren los últimos 30 días. Si se supera el límite de llamadas, la app cae automáticamente a Yahoo Finance RSS como respaldo.', 'Free plan with a limit of 60 calls per minute. News covers the last 30 days. If the call limit is exceeded, the app automatically falls back to Yahoo Finance RSS.')}
        </Term>
        <Term term="Yahoo Finance RSS — News (fallback)">
          {s('Feed público sin autenticación. Menos noticias que Finnhub y sin imágenes. Se usa automáticamente cuando Finnhub no responde o no tiene resultados.', 'Public feed without authentication. Fewer news items than Finnhub and no images. Used automatically when Finnhub does not respond or has no results.')}
        </Term>
        <Term term="ExchangeRate API — Exchange Rate (primary)">
          {s('Fuente principal para todos los tipos de cambio. Cubre más de 160 monedas incluyendo MXN, BRL, KRW, ZAR, TRY y otras que el BCE no publica. Plan gratuito con límite de 1,500 llamadas al mes. Si no responde, la app cae automáticamente a Frankfurter.', 'Primary source for all exchange rates. Covers 160+ currencies including MXN, BRL, KRW, ZAR, TRY and others not published by the ECB. Free plan with a limit of 1,500 calls per month. If it does not respond, the app automatically falls back to Frankfurter.')}
        </Term>
        <Term term="Frankfurter — Exchange Rate (fallback)">
          {s('Se usa automáticamente si ExchangeRate API no responde. Es una API de código abierto basada en las tasas de referencia del Banco Central Europeo (BCE). Gratuita, sin límites de uso, sin API key. Cubre ~30 monedas principales (EUR, GBP, JPY, CHF, CAD, AUD, etc.) pero no incluye MXN, BRL, KRW ni otras monedas emergentes. Fuente: frankfurter.app', 'Used automatically if ExchangeRate API does not respond. An open-source API based on European Central Bank (ECB) reference rates. Free, no usage limits, no API key. Covers ~30 major currencies (EUR, GBP, JPY, CHF, CAD, AUD, etc.) but does not include MXN, BRL, KRW or other emerging currencies. Source: frankfurter.app')}
        </Term>
        <Term term={s('Simulador de Portafolio — Importante', 'Portfolio Simulator — Important')}>
          {s('El portafolio es una simulación educativa. Los precios de compra/venta se obtienen de Yahoo Finance con retraso de ~15 minutos. No representa condiciones reales de mercado ni considera comisiones, impuestos o slippage. No usar para tomar decisiones financieras reales.', 'The portfolio is an educational simulation. Buy/sell prices are fetched from Yahoo Finance with a ~15-minute delay. It does not represent real market conditions and does not account for commissions, taxes, or slippage. Do not use for real financial decisions.')}
        </Term>
        <Term term={s('Disponibilidad del servicio', 'Service Availability')}>
          {s('La app depende de un Cloudflare Worker como proxy. Si Yahoo Finance o Finnhub cambian sus APIs o bloquean el acceso, algunos datos pueden dejar de aparecer temporalmente hasta que se actualice el proxy.', 'The app depends on a Cloudflare Worker as a proxy. If Yahoo Finance or Finnhub change their APIs or block access, some data may temporarily stop appearing until the proxy is updated.')}
        </Term>
      </Section>

      <Section query={query} title={s('Bolsas internacionales y otros instrumentos', 'International Exchanges & Other Instruments')}>
        <Term term={s('Formato de símbolos internacionales', 'International Symbol Format')}>
          {s('Yahoo Finance usa el formato SÍMBOLO.SUFIJO para acciones fuera de EE.UU. El sufijo indica la bolsa. Ejemplos: SHOP.TO (Toronto), ASML.AS (Amsterdam), SAP.DE (Frankfurt), 7203.T (Tokyo - Toyota), 0700.HK (Hong Kong - Tencent).', 'Yahoo Finance uses the SYMBOL.SUFFIX format for stocks outside the US. The suffix indicates the exchange. Examples: SHOP.TO (Toronto), ASML.AS (Amsterdam), SAP.DE (Frankfurt), 7203.T (Tokyo - Toyota), 0700.HK (Hong Kong - Tencent).')}
        </Term>
        <Term term={s('Bolsas soportadas (ejemplos de sufijos)', 'Supported Exchanges (suffix examples)')}>
          {s('.TO = Toronto · .L = Londres · .DE = Frankfurt · .PA = París · .AS = Amsterdam · .MI = Milán · .T = Tokyo · .HK = Hong Kong · .SS = Shanghai · .SZ = Shenzhen · .AX = Australia · .BO = Bombay · .NS = NSE India · .MX = México (BMV)', '.TO = Toronto · .L = London · .DE = Frankfurt · .PA = Paris · .AS = Amsterdam · .MI = Milan · .T = Tokyo · .HK = Hong Kong · .SS = Shanghai · .SZ = Shenzhen · .AX = Australia · .BO = Bombay · .NS = NSE India · .MX = Mexico (BMV)')}
        </Term>
        <Term term={s('Criptomonedas', 'Cryptocurrencies')}>
          {s('Se usan con el formato SÍMBOLO-USD. Ejemplos: BTC-USD (Bitcoin), ETH-USD (Ethereum), SOL-USD (Solana), ADA-USD (Cardano).', 'Use the SYMBOL-USD format. Examples: BTC-USD (Bitcoin), ETH-USD (Ethereum), SOL-USD (Solana), ADA-USD (Cardano).')}
        </Term>
        <Term term={s('Materias primas (Futuros)', 'Commodities (Futures)')}>
          {s('Se usan con el símbolo seguido de =F. Ejemplos: GC=F (Oro), SI=F (Plata), CL=F (Petróleo WTI), NG=F (Gas natural).', 'Use the symbol followed by =F. Examples: GC=F (Gold), SI=F (Silver), CL=F (WTI Crude Oil), NG=F (Natural Gas).')}
        </Term>
        <Term term={s('Índices bursátiles', 'Stock Indices')}>
          {s('Se usan con el prefijo ^. Ejemplos: ^GSPC (S&P 500), ^DJI (Dow Jones), ^IXIC (NASDAQ), ^FTSE (FTSE 100 Londres), ^N225 (Nikkei 225 Tokyo).', 'Use the ^ prefix. Examples: ^GSPC (S&P 500), ^DJI (Dow Jones), ^IXIC (NASDAQ), ^FTSE (FTSE 100 London), ^N225 (Nikkei 225 Tokyo).')}
        </Term>
        <Term term="ADRs (American Depositary Receipts)">
          {s('Acciones de empresas extranjeras que cotizan en bolsas americanas sin sufijo. Ejemplos: BABA (Alibaba), NIO (NIO Inc.), TSM (TSMC), SONY (Sony).', 'Shares of foreign companies listed on US exchanges without a suffix. Examples: BABA (Alibaba), NIO (NIO Inc.), TSM (TSMC), SONY (Sony).')}
        </Term>
      </Section>

      <Section query={query} title={s('¿Por qué puede no aparecer un stock?', 'Why might a stock not appear?')}>
        <Term term={s('Símbolo incorrecto', 'Incorrect Symbol')}>
          {s('El símbolo debe coincidir exactamente con el que usa Yahoo Finance, incluyendo el sufijo de bolsa si aplica. Ejemplo: para Toyota en Tokyo es 7203.T, no TOYOTA ni TM (que es el ADR en NYSE).', 'The symbol must match exactly what Yahoo Finance uses, including the exchange suffix if applicable. Example: for Toyota in Tokyo it is 7203.T, not TOYOTA or TM (which is the NYSE ADR).')}
        </Term>
        <Term term={s('Mercado cerrado o sin datos recientes', 'Market closed or no recent data')}>
          {s('Si seleccionas un rango intradía (1h, 6h, 24h) fuera del horario de mercado de esa bolsa, puede no haber datos. Los mercados internacionales tienen horarios distintos al NYSE.', 'If you select an intraday range (1h, 6h, 24h) outside that exchange\'s market hours, there may be no data. International markets have different hours than the NYSE.')}
        </Term>
        <Term term={s('Acción suspendida o delisted', 'Suspended or delisted stock')}>
          {s('Si la empresa fue retirada de la bolsa (delisted), quebró, fue adquirida o suspendida, Yahoo Finance puede no tener datos históricos recientes.', 'If the company was delisted, went bankrupt, was acquired, or suspended, Yahoo Finance may not have recent historical data.')}
        </Term>
        <Term term={s('Restricción de Yahoo Finance', 'Yahoo Finance restriction')}>
          {s('Yahoo Finance ocasionalmente bloquea o limita el acceso a ciertos símbolos o mercados. Si el proxy devuelve un error 401 o 404, es probable que Yahoo no tenga ese símbolo disponible en su API pública.', 'Yahoo Finance occasionally blocks or limits access to certain symbols or markets. If the proxy returns a 401 or 404 error, Yahoo likely does not have that symbol available in its public API.')}
        </Term>
        <Term term={s('Datos fundamentales no disponibles', 'Fundamental data not available')}>
          {s('Los datos de P/E, Beta, EPS, etc. solo están disponibles para acciones que cotizan en bolsas principales. Criptomonedas, futuros e índices no tienen estos datos fundamentales.', 'P/E, Beta, EPS, etc. data is only available for stocks listed on major exchanges. Cryptocurrencies, futures, and indices do not have fundamental data.')}
        </Term>
        <Term term={s('Diferencia de zona horaria', 'Time zone difference')}>
          {s('Los datos intradía de bolsas asiáticas o europeas pueden aparecer vacíos si los consultas durante su horario nocturno. Usa rangos de 1 semana o más para ver datos históricos sin importar la zona horaria.', 'Intraday data from Asian or European exchanges may appear empty if queried during their nighttime hours. Use ranges of 1 week or more to see historical data regardless of time zone.')}
        </Term>
      </Section>

      <Section query={query} title={s('Indicadores Técnicos', 'Technical Indicators')}>
        <Term term="RSI — Relative Strength Index (14)">
          {s('Mide la velocidad y magnitud de los movimientos de precio en una escala de 0 a 100. Un RSI por encima de 70 indica que la acción puede estar sobrecomprada (posible corrección a la baja). Un RSI por debajo de 30 indica que puede estar sobrevendida (posible rebote al alza).', 'Measures the speed and magnitude of price movements on a scale of 0 to 100. An RSI above 70 indicates the stock may be overbought (possible downward correction). An RSI below 30 indicates it may be oversold (possible upward bounce).')}
        </Term>
        <Term term="MACD — Moving Average Convergence Divergence">
          {s('Muestra la relación entre dos medias móviles exponenciales (EMA 12 y EMA 26). La línea MACD es la diferencia entre ambas. La línea Signal es una EMA de 9 períodos del MACD. Cuando el MACD cruza por encima de la Signal es señal alcista; cuando cruza por debajo, bajista.', 'Shows the relationship between two exponential moving averages (EMA 12 and EMA 26). The MACD line is the difference between them. The Signal line is a 9-period EMA of the MACD. When MACD crosses above Signal it is bullish; when it crosses below, bearish.')}
        </Term>
        <Term term={s('Bandas de Bollinger (20 períodos, 2 desviaciones estándar)', 'Bollinger Bands (20 periods, 2 std dev)')}>
          {s('Tres líneas alrededor del precio: la banda media es una media móvil simple de 20 períodos, y las bandas superior e inferior están a 2 desviaciones estándar de distancia. Cuando el precio toca la banda superior puede estar sobrecomprado; cuando toca la inferior, sobrevendido.', 'Three lines around the price: the middle band is a 20-period simple moving average, and the upper and lower bands are 2 standard deviations away. When the price touches the upper band it may be overbought; when it touches the lower band, oversold.')}
        </Term>
        <Term term={s('Estocástico (%K y %D)', 'Stochastic (%K and %D)')}>
          {s('Compara el precio de cierre actual con el rango de precios de los últimos 14 períodos. %K es la línea rápida y %D es una media móvil de %K. Valores por encima de 80 indican sobrecompra; por debajo de 20, sobreventa.', 'Compares the current closing price with the price range of the last 14 periods. %K is the fast line and %D is a moving average of %K. Values above 80 indicate overbought; below 20, oversold.')}
        </Term>
      </Section>

      <Section query={query} title={s('Reconocimiento de Patrones Gráficos', 'Chart Pattern Recognition')}>
        <Term term={s('Doble Techo', 'Double Top')}>
          {s('Patrón bajista formado por dos máximos a niveles similares con un mínimo entre ellos. Sugiere que el precio no pudo superar una resistencia dos veces y puede caer.', 'Bearish pattern formed by two highs at similar levels with a low between them. Suggests the price failed to break a resistance twice and may fall.')}
        </Term>
        <Term term={s('Doble Suelo', 'Double Bottom')}>
          {s('Patrón alcista formado por dos mínimos a niveles similares con un máximo entre ellos. Sugiere que el precio encontró soporte dos veces y puede subir.', 'Bullish pattern formed by two lows at similar levels with a high between them. Suggests the price found support twice and may rise.')}
        </Term>
        <Term term={s('Cabeza y Hombros', 'Head and Shoulders')}>
          {s('Patrón bajista con tres máximos: el central (cabeza) es más alto que los dos laterales (hombros). Indica posible reversión de tendencia alcista a bajista.', 'Bearish pattern with three highs: the central one (head) is higher than the two lateral ones (shoulders). Indicates a possible reversal from bullish to bearish trend.')}
        </Term>
        <Term term={s('Cabeza y Hombros Invertido', 'Inverse Head and Shoulders')}>
          {s('Patrón alcista con tres mínimos: el central es más bajo que los dos laterales. Indica posible reversión de tendencia bajista a alcista.', 'Bullish pattern with three lows: the central one is lower than the two lateral ones. Indicates a possible reversal from bearish to bullish trend.')}
        </Term>
        <Term term={s('Cuña Alcista / Bajista', 'Rising / Falling Wedge')}>
          {s('Patrón de consolidación donde el precio se mueve entre dos líneas convergentes. Una cuña alcista (líneas subiendo) suele resolverse a la baja; una cuña bajista (líneas bajando) suele resolverse al alza.', 'Consolidation pattern where the price moves between two converging lines. A rising wedge (lines going up) usually resolves downward; a falling wedge (lines going down) usually resolves upward.')}
        </Term>
        <Term term={s('Importante sobre los patrones', 'Important about patterns')}>
          {s('Los patrones son detectados algorítmicamente sobre los datos de precios disponibles. Son indicativos y no garantizan movimientos futuros. Se recomienda confirmar con otros indicadores antes de tomar decisiones.', 'Patterns are algorithmically detected on available price data. They are indicative and do not guarantee future movements. It is recommended to confirm with other indicators before making decisions.')}
        </Term>
      </Section>

      <Section query={query} title={s('Backtesting de Estrategias', 'Strategy Backtesting')}>
        <Term term={s('¿Qué es el backtesting?', 'What is backtesting?')}>
          {s('Es la simulación de una estrategia de inversión sobre datos históricos para evaluar cómo habría funcionado en el pasado. Permite comparar diferentes estrategias sin arriesgar dinero real.', 'It is the simulation of an investment strategy on historical data to evaluate how it would have performed in the past. Allows comparing different strategies without risking real money.')}
        </Term>
        <Term term={s('Estrategia RSI Sobrevendido/Sobrecomprado', 'RSI Oversold/Overbought Strategy')}>
          {s('Compra cuando el RSI cae por debajo de 30 (sobrevendido) y vende cuando supera 70 (sobrecomprado). Funciona bien en mercados laterales con oscilaciones claras.', 'Buy when RSI falls below 30 (oversold) and sell when it exceeds 70 (overbought). Works well in sideways markets with clear oscillations.')}
        </Term>
        <Term term={s('Estrategia Cruce MACD', 'MACD Crossover Strategy')}>
          {s('Compra cuando la línea MACD cruza por encima de la línea Signal, y vende cuando cruza por debajo. Captura tendencias pero puede generar señales falsas en mercados laterales.', 'Buy when the MACD line crosses above the Signal line, and sell when it crosses below. Captures trends but may generate false signals in sideways markets.')}
        </Term>
        <Term term={s('Estrategia Cruce EMA 20/50', 'EMA 20/50 Crossover Strategy')}>
          {s('Compra cuando la EMA de 20 períodos cruza por encima de la EMA de 50 (golden cross), y vende cuando cruza por debajo (death cross). Es una estrategia de seguimiento de tendencia.', 'Buy when the 20-period EMA crosses above the 50-period EMA (golden cross), and sell when it crosses below (death cross). It is a trend-following strategy.')}
        </Term>
        <Term term="Buy &amp; Hold">
          {s('Compra al inicio del período y mantiene hasta el final. Es la referencia para comparar si las otras estrategias agregan valor.', 'Buy at the start of the period and hold until the end. It is the benchmark to compare whether other strategies add value.')}
        </Term>
        <Term term={s('Métricas del backtest', 'Backtest Metrics')}>
          {s('Retorno total: ganancia/pérdida porcentual del capital. Win Rate: porcentaje de operaciones ganadoras. Max Drawdown: caída máxima desde un pico. PnL promedio: ganancia/pérdida promedio por operación. Los resultados históricos no garantizan rendimientos futuros.', 'Total return: percentage gain/loss on capital. Win Rate: percentage of winning trades. Max Drawdown: maximum drop from a peak. Avg PnL: average gain/loss per trade. Historical results do not guarantee future returns.')}
        </Term>
      </Section>

      <Section query={query} title={s('Análisis Comparativo', 'Comparative Analysis')}>
        <Term term={s('Volatilidad', 'Volatility')}>
          {s('Calculada como la desviación estándar de los precios dividida entre el precio medio, expresada en porcentaje. Una volatilidad alta indica que el precio fluctúa mucho; una baja indica mayor estabilidad.', 'Calculated as the standard deviation of prices divided by the mean price, expressed as a percentage. High volatility indicates the price fluctuates a lot; low volatility indicates greater stability.')}
        </Term>
        <Term term="Range %">
          {s('La diferencia porcentual entre el precio máximo y mínimo del período seleccionado. Indica cuánto se ha movido la acción en ese tiempo.', 'The percentage difference between the maximum and minimum price of the selected period. Indicates how much the stock has moved in that time.')}
        </Term>
        <Term term="vs Average">
          {s('Compara el precio actual con el precio promedio del período. Un valor positivo indica que el precio está por encima de su promedio reciente; negativo, por debajo.', 'Compares the current price with the average price of the period. A positive value indicates the price is above its recent average; negative, below.')}
        </Term>
        <Term term="RSI Signal">
          {s('Muestra el valor actual del RSI y su interpretación: SC (Sobrecomprado, RSI > 70), SV (Sobrevendido, RSI < 30) o N (Neutral).', 'Shows the current RSI value and its interpretation: OB (Overbought, RSI > 70), OS (Oversold, RSI < 30) or N (Neutral).')}
        </Term>
      </Section>

      <Section query={query} title={s('Comunidad', 'Community')}>
        <Term term={s('Feed de ideas', 'Ideas Feed')}>
          {s('Espacio donde los traders publican sus análisis y opiniones sobre acciones. Cada idea incluye los tickers relacionados, el sentimiento (alcista, bajista o neutral) y opcionalmente un enlace a una gráfica. Puedes ordenar por más recientes o más populares.', 'Space where traders publish their analyses and opinions on stocks. Each idea includes related tickers, sentiment (bullish, bearish, or neutral), and optionally a chart link. You can sort by most recent or most popular.')}
        </Term>
        <Term term={s('Buscar traders por @handle', 'Search traders by @handle')}>
          {s('En la pestaña Feed y en la pestaña Mensajes hay un buscador que te permite encontrar traders por su nombre de usuario (@handle). Escribe al menos 2 caracteres para ver resultados. Puedes incluir o no el símbolo @.', 'In the Feed and Messages tabs there is a search bar that lets you find traders by their username (@handle). Type at least 2 characters to see results. You can include or omit the @ symbol.')}
        </Term>
        <Term term={s('Perfil público de trader', 'Public trader profile')}>
          {s('Al hacer clic en el nombre o handle de cualquier autor en el feed, se abre su perfil público con su avatar, bio, país y sus últimas 20 ideas publicadas. Cualquier usuario puede ver perfiles, incluso sin cuenta.', 'Clicking on any author\'s name or handle in the feed opens their public profile with their avatar, bio, country, and their last 20 published ideas. Any user can view profiles, even without an account.')}
        </Term>
        <Term term={s('Chat directo en tiempo real', 'Real-time direct chat')}>
          {s('Los usuarios con cuenta de email pueden enviar mensajes privados a otros traders directamente desde su perfil. Los mensajes se entregan en tiempo real usando Supabase Realtime (WebSocket). No necesitas que la otra persona esté conectada — el mensaje queda guardado y lo verá cuando entre.', 'Users with an email account can send private messages to other traders directly from their profile. Messages are delivered in real time using Supabase Realtime (WebSocket). The other person does not need to be online — the message is saved and they will see it when they log in.')}
        </Term>
        <Term term={s('Pestaña Mensajes', 'Messages Tab')}>
          {s('Muestra todas tus conversaciones activas ordenadas por el mensaje más reciente. Incluye una vista previa del último mensaje, el nombre del otro trader y el tiempo relativo. El badge rojo en la pestaña indica cuántos mensajes no leídos tienes en total (muestra +99 si son más de 99).', 'Shows all your active conversations sorted by the most recent message. Includes a preview of the last message, the other trader\'s name, and relative time. The red badge on the tab shows how many unread messages you have in total (shows +99 if more than 99).')}
        </Term>
        <Term term={s('Mensajes no leídos', 'Unread messages')}>
          {s('Cada conversación muestra un badge con el número de mensajes que no has leído. Al abrir una conversación, todos los mensajes se marcan automáticamente como leídos.', 'Each conversation shows a badge with the number of messages you have not read. When you open a conversation, all messages are automatically marked as read.')}
        </Term>
        <Term term={s('Perfil de comunidad', 'Community profile')}>
          {s('En Ajustes puedes configurar tu handle, nombre, bio, avatar y país. El handle debe tener entre 3 y 30 caracteres (letras, números y guión bajo). Es tu identidad pública en la comunidad.', 'In Settings you can configure your handle, name, bio, avatar, and country. The handle must be between 3 and 30 characters (letters, numbers, and underscores). It is your public identity in the community.')}
        </Term>
        <Term term={s('¿Se guardan mis datos?', 'Is my data saved?')}>
          {s('Sí. El portafolio, alertas de precio y preferencias se sincronizan automáticamente con Supabase. Tus datos persisten entre dispositivos y sesiones. Si Supabase no está disponible, se usa localStorage como respaldo y se sincroniza en la siguiente operación exitosa.', 'Yes. Portfolio, price alerts, and preferences automatically sync with Supabase. Your data persists across devices and sessions. If Supabase is unavailable, localStorage is used as a fallback and syncs on the next successful operation.')}
        </Term>
      </Section>

      <Section query={query} title={s('Alertas de precio', 'Price Alerts')}>
        <Term term={s('¿Cómo funcionan?', 'How do they work?')}>
          {s('Configura una alerta para que te avise cuando una acción suba o baje de un precio determinado. Las alertas se verifican cada vez que se actualizan los precios en el portafolio. Requiere que el navegador tenga permisos de notificaciones activados.', 'Set an alert to notify you when a stock rises above or falls below a certain price. Alerts are checked every time prices update in the portfolio. Requires the browser to have notification permissions enabled.')}
        </Term>
        <Term term={s('Persistencia', 'Persistence')}>
          {s('Las alertas se guardan en Supabase (si tienes sesión) o en localStorage como respaldo. Se mantienen entre sesiones.', 'Alerts are saved in Supabase (if you have a session) or in localStorage as a fallback. They persist between sessions.')}
        </Term>
      </Section>

      <div className="border-t border-slate-700 pt-6 text-center">
        <p className="text-slate-500 text-xs">STCK-CMP · Created on Kiro by Pablo Casas</p>
      </div>
        </div>
      )}

      {/* ── FUNCIONAMIENTO ── */}
      {activeTab === 'funcionamiento' && (
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{s('Cómo usar STCK-CMP', 'How to use STCK-CMP')}</h1>
          <p className="text-slate-400 mb-8">{s('Guía paso a paso para sacar el máximo provecho de la plataforma.', 'Step-by-step guide to get the most out of the platform.')}</p>

          <div className="space-y-6">

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-base mb-3">1. {s('Comparador de acciones', 'Stock Comparator')}</h2>
              <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside leading-relaxed">
                <li>{s('Escribe el símbolo de una acción en el campo de búsqueda (ej. AAPL, TSLA, KO) y presiona Enter o el botón +.', 'Type a stock symbol in the search field (e.g. AAPL, TSLA, KO) and press Enter or the + button.')}</li>
                <li>{s('Puedes agregar varias acciones a la vez para compararlas en la misma gráfica.', 'You can add multiple stocks at once to compare them on the same chart.')}</li>
                <li>{s('Selecciona el rango de tiempo (1h, 1 semana, 1 mes, 1 año, etc.) para ajustar el período de la gráfica.', 'Select the time range (1h, 1 week, 1 month, 1 year, etc.) to adjust the chart period.')}</li>
                <li>{s('Usa el botón de moneda en la barra superior para cambiar entre USD, MXN, EUR u otras monedas configuradas.', 'Use the currency button in the top bar to switch between USD, MXN, EUR, or other configured currencies.')}</li>
                <li>{s('Presiona Actualizar para refrescar los precios manualmente.', 'Press Update to manually refresh prices.')}</li>
                <li>{s('En la sección Indicadores Técnicos puedes agregar acciones y ver RSI, MACD, Bollinger y Estocástico.', 'In the Technical Indicators section you can add stocks and view RSI, MACD, Bollinger, and Stochastic.')}</li>
                <li>{s('En Reconocimiento de Patrones agrega acciones para detectar automáticamente patrones gráficos como Doble Techo, Cabeza y Hombros, etc.', 'In Pattern Recognition add stocks to automatically detect chart patterns like Double Top, Head and Shoulders, etc.')}</li>
                <li>{s('En Backtesting de Estrategias selecciona una acción, un período y una estrategia para ver cómo habría funcionado históricamente.', 'In Strategy Backtesting select a stock, period, and strategy to see how it would have performed historically.')}</li>
              </ol>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-base mb-3">2. {s('Portafolio', 'Portfolio')}</h2>
              <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside leading-relaxed">
                <li>{s('Primero haz un depósito: escribe el monto y presiona "Depositar". Ese dinero es tu capital disponible para invertir.', 'First make a deposit: enter the amount and press "Deposit". That money is your available capital to invest.')}</li>
                <li>{s('Para comprar acciones escribe el símbolo, la cantidad de acciones y presiona "Comprar". El precio se obtiene automáticamente.', 'To buy stocks enter the symbol, number of shares, and press "Buy". The price is fetched automatically.')}</li>
                <li>{s('Para vender, escribe el símbolo y la cantidad de acciones que quieres vender y presiona "Vender".', 'To sell, enter the symbol and number of shares you want to sell and press "Sell".')}</li>
                <li>{s('Usa "Registrar Dividendo" para anotar dividendos recibidos: escribe el símbolo y el monto por acción.', 'Use "Record Dividend" to log received dividends: enter the symbol and amount per share.')}</li>
                <li>{s('La sección de Alertas (botón en la barra superior) te permite configurar notificaciones cuando una acción sube o baja de un precio.', 'The Alerts section (button in the top bar) lets you set notifications when a stock rises above or falls below a price.')}</li>
                <li>{s('En Cuentas de Banco puedes registrar cuentas de ahorro con tasa de crecimiento anual y cobros de tarjeta. Usa "Aplicar crecimiento mensual" para simular el rendimiento.', 'In Bank Accounts you can register savings accounts with annual growth rate and card fees. Use "Apply monthly growth" to simulate returns.')}</li>
                <li>{s('Todos los montos se muestran en la moneda seleccionada. Los datos se guardan automáticamente.', 'All amounts are shown in the selected currency. Data is saved automatically.')}</li>
              </ol>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-base mb-3">3. {s('Comunidad', 'Community')}</h2>
              <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside leading-relaxed">
                <li>{s('Inicia sesión con tu correo electrónico para participar en la comunidad.', 'Sign in with your email to participate in the community.')}</li>
                <li>{s('En Ajustes configura tu handle (@usuario), nombre, bio y país para que otros traders puedan encontrarte.', 'In Settings configure your handle (@user), name, bio, and country so other traders can find you.')}</li>
                <li>{s('Publica ideas en el feed: escribe tu análisis, agrega los tickers relacionados y selecciona el sentimiento (alcista, bajista o neutral).', 'Post ideas in the feed: write your analysis, add related tickers, and select the sentiment (bullish, bearish, or neutral).')}</li>
                <li>{s('Usa el buscador de traders para encontrar usuarios por su @handle y ver su perfil público.', 'Use the trader search to find users by their @handle and view their public profile.')}</li>
                <li>{s('Desde el perfil de un trader puedes iniciar un chat privado en tiempo real.', 'From a trader\'s profile you can start a real-time private chat.')}</li>
                <li>{s('La pestaña Mensajes muestra todas tus conversaciones activas con el número de mensajes no leídos.', 'The Messages tab shows all your active conversations with the number of unread messages.')}</li>
                <li>{s('Puedes borrar tus propios mensajes tanto en el feed como en los chats privados.', 'You can delete your own messages both in the feed and in private chats.')}</li>
              </ol>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-base mb-3">4. {s('Ajustes', 'Settings')}</h2>
              <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside leading-relaxed">
                <li>{s('Cambia el idioma entre Español e Inglés.', 'Change the language between Spanish and English.')}</li>
                <li>{s('Configura las monedas activas para la rotación (USD, MXN, EUR y más de 20 monedas disponibles).', 'Configure active currencies for rotation (USD, MXN, EUR and 20+ available currencies.')}</li>
                <li>{s('Ajusta la zona horaria para que los datos intradía se muestren en tu hora local.', 'Adjust the time zone so intraday data is shown in your local time.')}</li>
                <li>{s('Configura tu perfil de comunidad: handle, nombre, bio, avatar y país.', 'Configure your community profile: handle, name, bio, avatar, and country.')}</li>
                <li>{s('Usa el slider de "Máximo de acciones simultáneas" para elegir cuántas acciones puedes tener seleccionadas a la vez en el Comparador (rango: 4–20).', 'Use the "Maximum simultaneous stocks" slider to choose how many stocks you can have selected at once in the Comparator (range: 4–20).')}</li>
                <li>{s('En "Funciones visibles" puedes activar o desactivar secciones completas de la app (datos fundamentales, indicadores técnicos, patrones, backtesting, análisis comparativo, noticias, posiciones, historial, cuentas bancarias). Las secciones desactivadas desaparecen completamente — los datos nunca se borran.', 'In "Visible features" you can enable or disable entire sections of the app (fundamental data, technical indicators, patterns, backtesting, comparative analysis, news, positions, history, bank accounts). Disabled sections disappear completely — data is never deleted.')}</li>
                <li>{s('Usa "Restablecer valores predeterminados" para volver al idioma español, monedas USD/MXN/EUR, zona horaria NYSE y máximo de 8 acciones.', 'Use "Reset to Defaults" to return to Spanish, USD/MXN/EUR currencies, NYSE time zone, and 8 max stocks.')}</li>
              </ol>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-base mb-3">5. {s('Acciones internacionales y otros instrumentos', 'International stocks and other instruments')}</h2>
              <div className="text-slate-300 text-sm space-y-2 leading-relaxed">
                <p>{s('Puedes buscar cualquier instrumento que esté disponible en Yahoo Finance:', 'You can search for any instrument available on Yahoo Finance:')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{s('Acciones EE.UU.: sin sufijo (AAPL, MSFT, TSLA)', 'US stocks: no suffix (AAPL, MSFT, TSLA)')}</li>
                  <li>{s('Acciones internacionales: con sufijo de bolsa (ASML.AS, SAP.DE, 7203.T)', 'International stocks: with exchange suffix (ASML.AS, SAP.DE, 7203.T)')}</li>
                  <li>{s('Criptomonedas: formato SÍMBOLO-USD (BTC-USD, ETH-USD)', 'Cryptocurrencies: SYMBOL-USD format (BTC-USD, ETH-USD)')}</li>
                  <li>{s('Materias primas: sufijo =F (GC=F oro, CL=F petróleo)', 'Commodities: =F suffix (GC=F gold, CL=F oil)')}</li>
                  <li>{s('Índices: prefijo ^ (^GSPC S&P 500, ^DJI Dow Jones)', 'Indices: ^ prefix (^GSPC S&P 500, ^DJI Dow Jones)')}</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── FUNCIONES ── */}
      {activeTab === 'funciones' && (
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">{s('Funciones de STCK-CMP', 'STCK-CMP Features')}</h1>
          <p className="text-slate-400 mb-8">{s('Lista completa de todas las funciones disponibles en la plataforma.', 'Complete list of all features available on the platform.')}</p>
          <div className="space-y-4">
            {[
              { title: s('Comparador de acciones', 'Stock Comparator'), items: [
                s('Gráfica de precios históricos con múltiples acciones simultáneas', 'Historical price chart with multiple stocks simultaneously'),
                s('Rangos de tiempo: 1h, 6h, 24h, 1 semana, 1 mes, 3 meses, 6 meses, 1-15 años', 'Time ranges: 1h, 6h, 24h, 1 week, 1 month, 3 months, 6 months, 1-15 years'),
                s('Datos fundamentales: P/E, EPS, Beta, Div. Yield, capitalización, etc.', 'Fundamental data: P/E, EPS, Beta, Div. Yield, market cap, etc.'),
                s('Análisis comparativo: volatilidad, Range %, vs Average, RSI Signal', 'Comparative analysis: volatility, Range %, vs Average, RSI Signal'),
                s('Noticias financieras por acción con filtro de tiempo', 'Financial news per stock with time filter'),
                s('Sectores personalizables con acciones editables', 'Customizable sectors with editable stocks'),
                s('Banda de precios en tiempo real (ticker bar)', 'Real-time price ticker bar'),
              ]},
              { title: s('Indicadores Técnicos', 'Technical Indicators'), items: [
                s('RSI (Relative Strength Index, 14 períodos)', 'RSI (Relative Strength Index, 14 periods)'),
                s('MACD (Moving Average Convergence Divergence)', 'MACD (Moving Average Convergence Divergence)'),
                s('Bandas de Bollinger (20 períodos, 2 desviaciones estándar)', 'Bollinger Bands (20 periods, 2 standard deviations)'),
                s('Estocástico (%K y %D, 14 períodos)', 'Stochastic (%K and %D, 14 periods)'),
                s('Múltiples acciones simultáneas en cada indicador', 'Multiple stocks simultaneously in each indicator'),
              ]},
              { title: s('Reconocimiento de Patrones', 'Pattern Recognition'), items: [
                s('Detección automática: Doble Techo, Doble Suelo, Cabeza y Hombros, Cabeza y Hombros Invertido, Cuña Alcista, Cuña Bajista', 'Automatic detection: Double Top, Double Bottom, Head and Shoulders, Inverse H&S, Rising Wedge, Falling Wedge'),
                s('Confiabilidad del patrón (0-100%)', 'Pattern reliability (0-100%)'),
                s('Precio objetivo y stop loss sugerido', 'Target price and suggested stop loss'),
                s('Botones de alerta preconfigurada para objetivo y stop loss', 'Pre-configured alert buttons for target and stop loss'),
                s('Múltiples acciones simultáneas', 'Multiple stocks simultaneously'),
              ]},
              { title: s('Backtesting de Estrategias', 'Strategy Backtesting'), items: [
                s('Estrategias: RSI Sobrevendido/Sobrecomprado, Cruce MACD, Cruce EMA 20/50, Buy & Hold', 'Strategies: RSI Oversold/Overbought, MACD Crossover, EMA 20/50 Crossover, Buy & Hold'),
                s('Métricas: retorno total, win rate, max drawdown, PnL promedio', 'Metrics: total return, win rate, max drawdown, avg PnL'),
                s('Capital inicial en la moneda seleccionada', 'Initial capital in selected currency'),
                s('Múltiples acciones simultáneas', 'Multiple stocks simultaneously'),
              ]},
              { title: s('Portafolio Simulado', 'Simulated Portfolio'), items: [
                s('Depósito y retiro de efectivo virtual', 'Virtual cash deposit and withdrawal'),
                s('Compra y venta de acciones con precio automático de Yahoo Finance', 'Buy and sell stocks with automatic Yahoo Finance price'),
                s('Registro de dividendos', 'Dividend recording'),
                s('Auto-fill de datos de dividendo desde Yahoo Finance', 'Dividend data auto-fill from Yahoo Finance'),
                s('Gráfica de evolución del portafolio', 'Portfolio evolution chart'),
                s('Gráfica de valor total histórico', 'Historical total value chart'),
                s('Resumen: valor total, efectivo, inversiones, retorno total', 'Summary: total value, cash, investments, total return'),
                s('Posiciones con costo promedio, G/P vs compra, G/P en período', 'Positions with average cost, G/L vs purchase, G/L in period'),
                s('Historial de transacciones', 'Transaction history'),
                s('Cuentas de banco con tasa de crecimiento anual y cobros de tarjeta', 'Bank accounts with annual growth rate and card fees'),
                s('Alertas de precio con notificaciones del navegador', 'Price alerts with browser notifications'),
              ]},
              { title: s('Comunidad', 'Community'), items: [
                s('Feed de ideas con sentimiento (alcista, bajista, neutral)', 'Ideas feed with sentiment (bullish, bearish, neutral)'),
                s('Filtro por idioma (Español / English)', 'Language filter (Spanish / English)'),
                s('Ordenar por recientes o populares', 'Sort by recent or popular'),
                s('Trending tickers', 'Trending tickers'),
                s('Perfiles públicos de traders', 'Public trader profiles'),
                s('Búsqueda de traders por @handle', 'Trader search by @handle'),
                s('Chat privado en tiempo real (WebSocket)', 'Real-time private chat (WebSocket)'),
                s('Mensajes no leídos con badge', 'Unread messages with badge'),
                s('Borrar mensajes propios y ajenos', 'Delete own and others\' messages'),
              ]},
              { title: s('Ajustes', 'Settings'), items: [
                s('Idioma: Español, English, Français, Italiano, Deutsch, Português, 中文, Русский, العربية, 日本語, 한국어', 'Language: Spanish, English, French, Italian, German, Portuguese, Chinese, Russian, Arabic, Japanese, Korean'),
                s('Rotación de monedas: USD, MXN, EUR y más de 20 monedas', 'Currency rotation: USD, MXN, EUR and 20+ currencies'),
                s('Zona horaria personalizable', 'Customizable time zone'),
                s('Máximo de acciones simultáneas: slider de 4 a 20 acciones', 'Maximum simultaneous stocks: slider from 4 to 20'),
                s('Funciones visibles: activa/desactiva datos fundamentales, indicadores técnicos, patrones, backtesting, análisis comparativo, noticias (comparador), posiciones, historial de transacciones, cuentas bancarias, noticias (portafolio)', 'Visible features: enable/disable fundamental data, technical indicators, patterns, backtesting, comparative analysis, news (comparator), positions, transaction history, bank accounts, news (portfolio)'),
                s('Perfil de comunidad: handle, nombre, bio, avatar, país', 'Community profile: handle, name, bio, avatar, country'),
                s('Restablecer valores predeterminados', 'Reset to defaults'),
                s('Inicio de sesión con email y contraseña', 'Email and password sign in'),
              ]},
            ].map(({ title, items }) => (
              <div key={title} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h2 className="text-blue-400 font-bold text-sm mb-3">{title}</h2>
                <ul className="space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-slate-300 text-xs flex gap-2">
                      <span className="text-blue-500 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CÓDIGOS ── */}
      {activeTab === 'codigos' && (
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">{s('Códigos de instrumentos', 'Instrument Symbol Codes')}</h1>
          <p className="text-slate-400 mb-2">{s('Todos los instrumentos usan el formato de Yahoo Finance. Si un símbolo no aparece, revisa este manual.', 'All instruments use Yahoo Finance format. If a symbol does not appear, check this guide.')}</p>
          <p className="text-amber-300 text-xs mb-8">{s('Si ingresas un símbolo y no aparecen datos, verifica el formato correcto en esta sección.', 'If you enter a symbol and no data appears, verify the correct format in this section.')}</p>

          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">{s('Acciones EE.UU. (NYSE / NASDAQ)', 'US Stocks (NYSE / NASDAQ)')}</h2>
              <p className="text-slate-400 text-xs mb-2">{s('Sin sufijo. Solo el ticker.', 'No suffix. Just the ticker.')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                {['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','AMD','INTC','JPM','BAC','KO','PEP','JNJ','WMT','DIS','NFLX','PYPL','V','MA'].map(s => (
                  <span key={s} className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">{s('Criptomonedas', 'Cryptocurrencies')}</h2>
              <p className="text-slate-400 text-xs mb-2">{s('Formato: SÍMBOLO-USD', 'Format: SYMBOL-USD')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                {['BTC-USD','ETH-USD','SOL-USD','ADA-USD','XRP-USD','DOGE-USD','DOT-USD','AVAX-USD','MATIC-USD','LINK-USD','LTC-USD','BNB-USD'].map(s => (
                  <span key={s} className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">{s('Índices bursátiles', 'Stock Indices')}</h2>
              <p className="text-slate-400 text-xs mb-2">{s('Formato: ^SÍMBOLO', 'Format: ^SYMBOL')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {[
                  ['^GSPC','S&P 500'],['^DJI','Dow Jones'],['^IXIC','NASDAQ Composite'],['^RUT','Russell 2000'],
                  ['^FTSE','FTSE 100 (Londres)'],['^DAX','DAX (Frankfurt)'],['^FCHI','CAC 40 (París)'],
                  ['^N225','Nikkei 225 (Tokyo)'],['^HSI','Hang Seng (Hong Kong)'],['^SSEC','Shanghai Composite'],
                  ['^MXX','IPC (México)'],['^BVSP','Bovespa (Brasil)'],
                ].map(([sym, name]) => (
                  <div key={sym} className="flex gap-2 items-center">
                    <span className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono shrink-0">{sym}</span>
                    <span className="text-slate-400">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">{s('Materias primas (Futuros)', 'Commodities (Futures)')}</h2>
              <p className="text-slate-400 text-xs mb-2">{s('Formato: SÍMBOLO=F', 'Format: SYMBOL=F')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {[
                  ['GC=F','Oro (Gold)'],['SI=F','Plata (Silver)'],['CL=F','Petróleo WTI'],['BZ=F','Petróleo Brent'],
                  ['NG=F','Gas Natural'],['HG=F','Cobre (Copper)'],['ZC=F','Maíz (Corn)'],['ZW=F','Trigo (Wheat)'],
                ].map(([sym, name]) => (
                  <div key={sym} className="flex gap-2 items-center">
                    <span className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono shrink-0">{sym}</span>
                    <span className="text-slate-400">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">{s('ETFs populares', 'Popular ETFs')}</h2>
              <p className="text-slate-400 text-xs mb-2">{s('Sin sufijo, igual que acciones americanas.', 'No suffix, same as US stocks.')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {[
                  ['SPY','S&P 500 ETF'],['QQQ','NASDAQ 100 ETF'],['DIA','Dow Jones ETF'],['IWM','Russell 2000 ETF'],
                  ['GLD','Gold ETF'],['SLV','Silver ETF'],['TLT','20+ Year Treasury ETF'],['VTI','Total Stock Market ETF'],
                  ['VEA','Developed Markets ETF'],['VWO','Emerging Markets ETF'],['XLF','Financial Sector ETF'],['XLK','Technology Sector ETF'],
                ].map(([sym, name]) => (
                  <div key={sym} className="flex gap-2 items-center">
                    <span className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono shrink-0">{sym}</span>
                    <span className="text-slate-400">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">{s('Acciones internacionales (sufijos por bolsa)', 'International Stocks (exchange suffixes)')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs mb-3">
                {[
                  ['.MX','México (BMV)'],['.TO','Toronto (TSX)'],['.L','Londres (LSE)'],['.DE','Frankfurt (XETRA)'],
                  ['.PA','París (Euronext)'],['.AS','Amsterdam'],['.MI','Milán'],['.MC','Madrid'],
                  ['.T','Tokyo (TSE)'],['.HK','Hong Kong'],['.SS','Shanghai'],['.SZ','Shenzhen'],
                  ['.AX','Australia (ASX)'],['.BO','Bombay (BSE)'],['.NS','NSE India'],['.SA','São Paulo (B3)'],
                ].map(([suf, name]) => (
                  <div key={suf} className="flex gap-2 items-center">
                    <span className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono shrink-0">{suf}</span>
                    <span className="text-slate-400">{name}</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs">{s('Ejemplos: AMXL.MX (América Móvil), SHOP.TO (Shopify Toronto), SAP.DE (SAP Frankfurt), 7203.T (Toyota Tokyo), 0700.HK (Tencent Hong Kong)', 'Examples: AMXL.MX (América Móvil), SHOP.TO (Shopify Toronto), SAP.DE (SAP Frankfurt), 7203.T (Toyota Tokyo), 0700.HK (Tencent Hong Kong)')}</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-blue-400 font-bold text-sm mb-3">ADRs {s('(acciones extranjeras en NYSE/NASDAQ)', '(foreign stocks on NYSE/NASDAQ)')}</h2>
              <p className="text-slate-400 text-xs mb-2">{s('Sin sufijo. Cotizan en EE.UU.', 'No suffix. Listed in the US.')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                {['BABA','NIO','TSM','SONY','TM','ASML','SAP','SHOP','SE','MELI','VALE','PBR'].map(s => (
                  <span key={s} className="bg-slate-700 text-slate-200 px-2 py-1 rounded font-mono">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
              <p className="text-amber-300 text-xs font-semibold mb-1">{s('Si el símbolo no aparece', 'If the symbol does not appear')}</p>
              <p className="text-slate-300 text-xs">{s('Verifica el formato exacto en finance.yahoo.com buscando la empresa. El símbolo que aparece en la URL o en la página es el que debes usar aquí.', 'Verify the exact format at finance.yahoo.com by searching for the company. The symbol shown in the URL or on the page is the one you should use here.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── NOSOTROS ── */}
      {activeTab === 'nosotros' && (
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-white mb-8">{s('Acerca de STCK-CMP', 'About STCK-CMP')}</h1>

          <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
            <p className="text-base text-slate-200">
              {s(
                'STCK-CMP nació con un propósito claro: simplificar la gestión financiera para quienes operan en mercados de renta variable, sin importar si están comenzando su camino en el mundo del day trading o si ya cuentan con experiencia en la operación de activos.',
                'STCK-CMP was born with a clear purpose: to simplify financial management for those who operate in equity markets, whether they are just starting out in the world of day trading or already have experience managing assets.'
              )}
            </p>

            <div>
              <h2 className="text-blue-400 font-bold text-base mb-2">{s('El problema', 'The problem')}</h2>
              <p>
                {s(
                  'Gestionar múltiples acciones de forma simultánea representa uno de los mayores retos para estudiantes y profesionales del trading. Las herramientas disponibles en el mercado suelen ser complejas, costosas o poco intuitivas, lo que genera fricciones innecesarias al momento de tomar decisiones financieras con rapidez y precisión.',
                  'Managing multiple stocks simultaneously is one of the biggest challenges for trading students and professionals. The tools available on the market tend to be complex, expensive, or unintuitive, creating unnecessary friction when making financial decisions quickly and accurately.'
                )}
              </p>
            </div>

            <div>
              <h2 className="text-blue-400 font-bold text-base mb-2">{s('Nuestra solución', 'Our solution')}</h2>
              <p>
                {s(
                  'STCK-CMP centraliza y organiza los datos de distintas acciones en un solo lugar, ofreciendo una experiencia de uso clara, accesible y eficiente. La plataforma fue diseñada para eliminar la complejidad técnica sin sacrificar la profundidad de la información, permitiendo que el usuario enfoque su atención en lo que realmente importa: tomar mejores decisiones financieras.',
                  'STCK-CMP centralizes and organizes data from different stocks in one place, offering a clear, accessible, and efficient user experience. The platform was designed to eliminate technical complexity without sacrificing the depth of information, allowing users to focus their attention on what really matters: making better financial decisions.'
                )}
              </p>
            </div>

            <div>
              <h2 className="text-blue-400 font-bold text-base mb-2">{s('Nuestra misión', 'Our mission')}</h2>
              <p>
                {s(
                  'Democratizar el acceso a herramientas de gestión financiera profesional, poniendo a disposición de estudiantes y traders una plataforma que combine funcionalidad, simplicidad y accesibilidad en un mismo lugar.',
                  'To democratize access to professional financial management tools, providing students and traders with a platform that combines functionality, simplicity, and accessibility in one place.'
                )}
              </p>
            </div>

            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
              <h2 className="text-amber-300 font-bold text-base mb-2">{s('Estado actual de la plataforma', 'Current platform status')}</h2>
              <p>
                {s(
                  'STCK-CMP opera actualmente con servicios gratuitos en todas sus capas: datos de mercado vía Yahoo Finance (sin API oficial), base de datos y autenticación vía Supabase (plan gratuito), y proxy vía Cloudflare Workers (plan gratuito). Esto significa que la plataforma tiene limitaciones reales: datos con retraso de ~15 minutos, límites de llamadas por hora, y algunas funciones con disponibilidad reducida.',
                  'STCK-CMP currently runs entirely on free-tier services: market data via Yahoo Finance (no official API), database and auth via Supabase (free plan), and proxy via Cloudflare Workers (free plan). This means the platform has real limitations: ~15-minute data delays, hourly call limits, and some features with reduced availability.'
                )}
              </p>
              <p className="mt-2">
                {s(
                  'No contamos con capital externo ni financiamiento institucional. Todo lo que ves fue construido con recursos propios y tiempo personal. Estamos trabajando para mejorar esto.',
                  'We have no external capital or institutional funding. Everything you see was built with personal resources and personal time. We are working to change that.'
                )}
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4">
              <h2 className="text-blue-400 font-bold text-base mb-2">{s('Comparte tu opinión', 'Share your feedback')}</h2>
              <p>
                {s(
                  'Tu opinión nos ayuda a mejorar. Si tienes sugerencias, encontraste un error, o simplemente quieres decirnos qué te parece la plataforma, escríbenos directamente:',
                  'Your feedback helps us improve. If you have suggestions, found a bug, or just want to tell us what you think of the platform, write to us directly:'
                )}
              </p>
              <a
                href="mailto:pablocasas22@proton.me"
                className="inline-block mt-3 text-blue-400 hover:text-blue-300 font-medium text-sm underline underline-offset-2"
              >
                pablocasas22@proton.me
              </a>
            </div>
          </div>

          <div className="border-t border-slate-700 mt-10 pt-6 text-center">
            <p className="text-slate-500 text-xs">STCK-CMP · Created on Kiro by Pablo Casas</p>
          </div>
        </div>
      )}

    </div>
  );
}
