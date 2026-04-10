import React from 'react';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-blue-400 text-lg font-bold mb-4 border-b border-slate-700 pb-2">{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

const Term = ({ term, children }) => (
  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
    <p className="text-white font-semibold mb-1">{term}</p>
    <p className="text-slate-300 text-sm leading-relaxed">{children}</p>
  </div>
);

export default function About() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Diccionario de Valores</h1>
        <p className="text-slate-400">Guía de referencia para todos los datos que aparecen en el Comparador y el Portafolio.</p>
      </div>

      {/* ── COMPARADOR ── */}
      <Section title="📊 Comparador — Precios y variación">
        <Term term="Precio Actual">
          El último precio de cierre registrado para la acción en el mercado. Es el precio al que se negoció la acción en la última operación del día.
        </Term>
        <Term term="Promedio">
          El precio promedio de la acción durante el período de tiempo seleccionado (1 hora, 1 mes, 1 año, etc.).
        </Term>
        <Term term="Cambio %">
          La variación porcentual del precio entre el primer y el último dato del período seleccionado. Positivo = subió, negativo = bajó.
        </Term>
        <Term term="Mín / Máx del período">
          El precio más bajo y más alto registrado durante el período de tiempo seleccionado en la gráfica.
        </Term>
        <Term term="Apertura">
          El precio al que abrió la acción al inicio de la sesión de trading del día actual.
        </Term>
        <Term term="Máx. día / Mín. día">
          El precio más alto y más bajo que alcanzó la acción durante la sesión de trading del día actual.
        </Term>
        <Term term="Máx. 52S / Mín. 52S">
          El precio más alto y más bajo que ha tenido la acción en los últimos 52 semanas (1 año). Son referencias importantes para evaluar si la acción está cara o barata históricamente.
        </Term>
        <Term term="Vol. (Volumen)">
          El número total de acciones que se han comprado y vendido durante la sesión del día. Un volumen alto indica mucho interés en la acción.
        </Term>
        <Term term="V. medio (Volumen promedio)">
          El promedio de acciones negociadas por día en los últimos 3 meses. Sirve para comparar si el volumen actual es inusualmente alto o bajo.
        </Term>
        <Term term="Cap. merc. (Capitalización de mercado)">
          El valor total de la empresa en el mercado. Se calcula multiplicando el precio de la acción por el número total de acciones. Ejemplo: si una acción vale $100 y hay 1,000 millones de acciones, la capitalización es $100,000 millones.
        </Term>
      </Section>

      <Section title="📈 Comparador — Datos Fundamentales">
        <Term term="P/E (Precio / Ganancia TTM)">
          Indica cuántos años de beneficios estás pagando al comprar la acción hoy. Un P/E de 20 significa que pagas 20 veces las ganancias anuales. Un P/E alto puede indicar expectativas de crecimiento; uno bajo puede indicar que la acción está barata o que la empresa tiene problemas.
        </Term>
        <Term term="P/E Fwd (P/E Forward)">
          Similar al P/E, pero usando las ganancias estimadas para el próximo año en lugar de las del año pasado. Refleja las expectativas del mercado sobre el futuro de la empresa.
        </Term>
        <Term term="P/B (Precio / Valor Contable)">
          Compara el precio de mercado con el valor contable de la empresa (lo que posee físicamente menos lo que debe). Un valor menor a 1 puede indicar que la acción cotiza por debajo de su valor real en libros.
        </Term>
        <Term term="P/S (Precio / Ventas)">
          Compara el precio de la acción con los ingresos por ventas de la empresa. Útil para empresas que aún no tienen ganancias pero sí generan ingresos.
        </Term>
        <Term term="EPS (Ganancias por Acción TTM)">
          El beneficio neto de la empresa dividido entre el número total de acciones. Debe ser creciente con el tiempo; si cae, puede ser señal de que la empresa está perdiendo rentabilidad.
        </Term>
        <Term term="EPS Fwd (EPS Forward)">
          Las ganancias por acción estimadas para el próximo año. Refleja las expectativas de los analistas sobre la rentabilidad futura.
        </Term>
        <Term term="Div. Yield (Dividendo)">
          El porcentaje de rentabilidad extra que recibes en efectivo cada año por ser dueño de la acción. Un Div. Yield de 3% significa que por cada $100 invertidos recibes $3 al año en dividendos.
        </Term>
        <Term term="Beta">
          Mide la volatilidad de la acción comparada con el mercado general (S&P 500). Beta mayor a 1 = más volátil que el mercado. Beta menor a 1 = más estable. Ejemplo: Beta de 1.5 significa que si el mercado sube 10%, la acción tiende a subir 15%.
        </Term>
      </Section>

      <Section title="🕐 Comparador — Rangos de tiempo">
        <Term term="1 Hora / 6 Horas / 24 Horas">
          Datos intradía. El eje X muestra la hora (HH:MM). Útil para ver movimientos del día actual.
        </Term>
        <Term term="1 Semana / 1 Mes / 3 Meses / 6 Meses">
          Datos históricos de corto a mediano plazo. El eje X muestra la fecha.
        </Term>
        <Term term="1 Año / 2 Años / 3 Años / 5 Años / 10 Años / 15 Años">
          Datos históricos de largo plazo. Útil para evaluar tendencias y el desempeño histórico de la empresa.
        </Term>
        <Term term="Hora ET / Hora CDMX">
          ET = Hora del Este de EE.UU., zona horaria de la Bolsa de Nueva York (NYSE). El mercado abre a las 9:30 AM ET y cierra a las 4:00 PM ET. CDMX normalmente es 1 hora menos que ET.
        </Term>
      </Section>

      {/* ── PORTAFOLIO ── */}
      <Section title="💼 Portafolio — Gráficas">
        <Term term="Gráfica del Portafolio">
          Muestra la evolución del precio de cada acción que tienes en tu portafolio a lo largo del tiempo. Solo aparece cuando tienes al menos una acción comprada (posición abierta).
        </Term>
        <Term term="Gráfica de Valor Total del Portafolio">
          Muestra cómo ha crecido o disminuido el valor total de tu portafolio desde la primera transacción. Solo aparece cuando tienes al menos una transacción registrada — ya sea un depósito, compra, venta o dividendo.
        </Term>
        <Term term="¿Se guardan mis datos?">
          Sí. Todo el portafolio (efectivo, acciones, transacciones) se guarda automáticamente en el almacenamiento local de tu dispositivo (localStorage). Si limpias el caché del browser o reinstalaas la app, los datos se perderán.
        </Term>
      </Section>

      <Section title="💼 Portafolio — Resumen">
        <Term term="Valor Total">
          La suma del efectivo disponible más el valor actual de todas tus acciones a precios de mercado.
        </Term>
        <Term term="Efectivo">
          El dinero en tu cuenta que no está invertido en acciones. Disponible para comprar más acciones.
        </Term>
        <Term term="Inversiones">
          El valor actual de todas tus acciones calculado con los precios de mercado más recientes.
        </Term>
        <Term term="Retorno Total">
          La diferencia entre el valor actual de tu portafolio y el dinero neto que has depositado. Incluye ganancias/pérdidas no realizadas y dividendos recibidos.
        </Term>
      </Section>

      <Section title="💼 Portafolio — Ganancias">
        <Term term="Ganancias por Dividendos">
          El total acumulado de dividendos que has recibido desde que empezaste a usar el simulador.
        </Term>
        <Term term="Ganancia por Valor de Acciones">
          La diferencia entre el precio actual de tus acciones y el precio promedio al que las compraste (costo promedio). Puede ser positiva (ganancia no realizada) o negativa (pérdida no realizada).
        </Term>
        <Term term="Ganancia Total">
          La suma de las ganancias por dividendos más las ganancias por valor de acciones.
        </Term>
      </Section>

      <Section title="💼 Portafolio — Posiciones">
        <Term term="Comprado a (Costo promedio)">
          El precio promedio al que compraste todas tus acciones de ese símbolo. Si compraste en diferentes momentos, es el promedio ponderado.
        </Term>
        <Term term="Precio hace X período">
          El precio de la acción al inicio del período de comparación seleccionado (1 hora, 1 semana, 1 mes, etc.).
        </Term>
        <Term term="G/P vs compra">
          Ganancia o pérdida comparando el precio actual con tu costo promedio de compra. Muestra cuánto has ganado o perdido desde que compraste.
        </Term>
        <Term term="G/P en período">
          Ganancia o pérdida comparando el precio actual con el precio al inicio del período seleccionado. Muestra el rendimiento reciente independientemente de cuándo compraste.
        </Term>
      </Section>

      <Section title="💼 Portafolio — Operaciones">
        <Term term="Depositar / Retirar">
          Simula agregar o quitar dinero de tu cuenta bancaria virtual. El dinero depositado es el capital disponible para invertir.
        </Term>
        <Term term="Comprar">
          Adquirir acciones de una empresa. El costo total se descuenta de tu efectivo disponible. El precio se obtiene automáticamente de Yahoo Finance.
        </Term>
        <Term term="Vender">
          Vender acciones que tienes en tu portafolio. El monto se agrega a tu efectivo disponible.
        </Term>
        <Term term="Registrar Dividendo">
          Registra el pago de dividendo por acción que recibiste. Se multiplica por el número de acciones que tienes y se agrega a tu efectivo.
        </Term>
      </Section>

      <Section title="📰 Noticias">
        <Term term="Fuente de noticias">
          Las noticias se obtienen de Finnhub (fuente principal) con fallback a Yahoo Finance RSS. Cubren los últimos 30 días de cobertura periodística sobre la empresa.
        </Term>
        <Term term="Filtro de tiempo">
          Filtra las noticias por antigüedad: 1 hora, 6 horas, 24 horas, 48 horas, 7 días o todas. El filtro se aplica localmente sobre las noticias ya descargadas.
        </Term>
      </Section>

      <Section title="🔗 Fuentes de datos y limitaciones">
        <Term term="Yahoo Finance — Precios históricos">
          Fuente principal para gráficas y precios. Los datos tienen un retraso de ~15 minutos durante el horario de mercado. No es un feed en tiempo real. Fuera del horario de mercado (antes de las 9:30 AM ET y después de las 4:00 PM ET) los precios no se actualizan.
        </Term>
        <Term term="Yahoo Finance — Datos fundamentales (quoteSummary)">
          Fuente para P/E, Beta, EPS, dividendos, capitalización, etc. Estos datos se actualizan con menor frecuencia que los precios — típicamente una vez al día o cuando la empresa reporta resultados. Requiere autenticación con crumb; si Yahoo cambia su API, estos datos pueden dejar de funcionar temporalmente.
        </Term>
        <Term term="Finnhub — Noticias">
          Plan gratuito con límite de 60 llamadas por minuto. Las noticias cubren los últimos 30 días. Si se supera el límite de llamadas, la app cae automáticamente a Yahoo Finance RSS como respaldo.
        </Term>
        <Term term="Yahoo Finance RSS — Noticias (fallback)">
          Feed público sin autenticación. Menos noticias que Finnhub y sin imágenes. Se usa automáticamente cuando Finnhub no responde o no tiene resultados.
        </Term>
        <Term term="ExchangeRate API — Tipo de cambio (fuente principal)">
          Fuente principal para todos los tipos de cambio. Cubre más de 160 monedas incluyendo MXN, BRL, KRW, ZAR, TRY y otras que el BCE no publica. Plan gratuito con límite de 1,500 llamadas al mes. Si no responde, la app cae automáticamente a Frankfurter.
        </Term>
        <Term term="Frankfurter — Tipo de cambio (fallback)">
          Se usa automáticamente si ExchangeRate API no responde. Es una API de código abierto basada en las tasas de referencia del Banco Central Europeo (BCE). Gratuita, sin límites de uso, sin API key. Cubre ~30 monedas principales (EUR, GBP, JPY, CHF, CAD, AUD, etc.) pero no incluye MXN, BRL, KRW ni otras monedas emergentes. Fuente: frankfurter.app
        </Term>
        <Term term="Simulador de Portafolio — Importante">
          El portafolio es una simulación educativa. Los precios de compra/venta se obtienen de Yahoo Finance con retraso de ~15 minutos. No representa condiciones reales de mercado ni considera comisiones, impuestos o slippage. No usar para tomar decisiones financieras reales.
        </Term>
        <Term term="Disponibilidad del servicio">
          La app depende de un Cloudflare Worker como proxy. Si Yahoo Finance o Finnhub cambian sus APIs o bloquean el acceso, algunos datos pueden dejar de aparecer temporalmente hasta que se actualice el proxy.
        </Term>
      </Section>

      <Section title="🌍 Bolsas internacionales y otros instrumentos">
        <Term term="Formato de símbolos internacionales">
          Yahoo Finance usa el formato SÍMBOLO.SUFIJO para acciones fuera de EE.UU. El sufijo indica la bolsa. Ejemplos: SHOP.TO (Toronto), ASML.AS (Amsterdam), SAP.DE (Frankfurt), 7203.T (Tokyo - Toyota), 0700.HK (Hong Kong - Tencent).
        </Term>
        <Term term="Bolsas soportadas (ejemplos de sufijos)">
          .TO = Toronto · .L = Londres · .DE = Frankfurt · .PA = París · .AS = Amsterdam · .MI = Milán · .T = Tokyo · .HK = Hong Kong · .SS = Shanghai · .SZ = Shenzhen · .AX = Australia · .BO = Bombay · .NS = NSE India · .MX = México (BMV)
        </Term>
        <Term term="Criptomonedas">
          Se usan con el formato SÍMBOLO-USD. Ejemplos: BTC-USD (Bitcoin), ETH-USD (Ethereum), SOL-USD (Solana), ADA-USD (Cardano).
        </Term>
        <Term term="Materias primas (Futuros)">
          Se usan con el símbolo seguido de =F. Ejemplos: GC=F (Oro), SI=F (Plata), CL=F (Petróleo WTI), NG=F (Gas natural).
        </Term>
        <Term term="Índices bursátiles">
          Se usan con el prefijo ^. Ejemplos: ^GSPC (S&P 500), ^DJI (Dow Jones), ^IXIC (NASDAQ), ^FTSE (FTSE 100 Londres), ^N225 (Nikkei 225 Tokyo).
        </Term>
        <Term term="ADRs (American Depositary Receipts)">
          Acciones de empresas extranjeras que cotizan en bolsas americanas sin sufijo. Ejemplos: BABA (Alibaba), NIO (NIO Inc.), TSM (TSMC), SONY (Sony).
        </Term>
      </Section>

      <Section title="⚠️ ¿Por qué puede no aparecer un stock?">
        <Term term="Símbolo incorrecto">
          El símbolo debe coincidir exactamente con el que usa Yahoo Finance, incluyendo el sufijo de bolsa si aplica. Ejemplo: para Toyota en Tokyo es 7203.T, no TOYOTA ni TM (que es el ADR en NYSE).
        </Term>
        <Term term="Mercado cerrado o sin datos recientes">
          Si seleccionas un rango intradía (1h, 6h, 24h) fuera del horario de mercado de esa bolsa, puede no haber datos. Los mercados internacionales tienen horarios distintos al NYSE.
        </Term>
        <Term term="Acción suspendida o delisted">
          Si la empresa fue retirada de la bolsa (delisted), quebró, fue adquirida o suspendida, Yahoo Finance puede no tener datos históricos recientes.
        </Term>
        <Term term="Restricción de Yahoo Finance">
          Yahoo Finance ocasionalmente bloquea o limita el acceso a ciertos símbolos o mercados. Si el proxy devuelve un error 401 o 404, es probable que Yahoo no tenga ese símbolo disponible en su API pública.
        </Term>
        <Term term="Datos fundamentales no disponibles">
          Los datos de P/E, Beta, EPS, etc. solo están disponibles para acciones que cotizan en bolsas principales. Criptomonedas, futuros e índices no tienen estos datos fundamentales.
        </Term>
        <Term term="Diferencia de zona horaria">
          Los datos intradía de bolsas asiáticas o europeas pueden aparecer vacíos si los consultas durante su horario nocturno. Usa rangos de 1 semana o más para ver datos históricos sin importar la zona horaria.
        </Term>
      </Section>

      <div className="border-t border-slate-700 pt-6 text-center">
        <p className="text-slate-500 text-xs">STOCK-CMP · Created on Kiro by Pablo Casas</p>
      </div>
    </div>
  );
}
