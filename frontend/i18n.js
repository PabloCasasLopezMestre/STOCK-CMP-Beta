// Internationalization — primary UI strings
// Full translation for: es, en, fr, it, de, pt, zh, ru, ar
// Partial translation for: ja, ko (navigation + key labels only)

export const LANGUAGES = [
  { code: 'es', label: 'Español',    flag: '🇲🇽', dir: 'ltr' },
  { code: 'en', label: 'English',    flag: '🇺🇸', dir: 'ltr' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹', dir: 'ltr' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷', dir: 'ltr' },
  { code: 'zh', label: '中文',        flag: '🇨🇳', dir: 'ltr' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
  { code: 'ja', label: '日本語',      flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: '한국어',      flag: '🇰🇷', dir: 'ltr' },
];

const T = {
  // ── Navigation ──
  nav_compare: {
    es:'Comparador', en:'Comparator', fr:'Comparateur', it:'Comparatore',
    de:'Vergleich', pt:'Comparador', zh:'比较器', ru:'Сравнение',
    ar:'المقارن', ja:'比較', ko:'비교기',
  },
  nav_portfolio: {
    es:'Portafolio', en:'Portfolio', fr:'Portefeuille', it:'Portafoglio',
    de:'Portfolio', pt:'Portfólio', zh:'投资组合', ru:'Портфель',
    ar:'المحفظة', ja:'ポートフォリオ', ko:'포트폴리오',
  },
  nav_settings: {
    es:'⚙️ Ajustes', en:'⚙️ Settings', fr:'⚙️ Paramètres', it:'⚙️ Impostazioni',
    de:'⚙️ Einstellungen', pt:'⚙️ Configurações', zh:'⚙️ 设置', ru:'⚙️ Настройки',
    ar:'⚙️ الإعدادات', ja:'⚙️ 設定', ko:'⚙️ 설정',
  },
  nav_about: {
    es:'Acerca', en:'About', fr:'À propos', it:'Informazioni',
    de:'Über', pt:'Sobre', zh:'关于', ru:'О приложении',
    ar:'حول', ja:'について', ko:'정보',
  },

  // ── Common buttons ──
  btn_update: {
    es:'Actualizar', en:'Update', fr:'Actualiser', it:'Aggiorna',
    de:'Aktualisieren', pt:'Atualizar', zh:'更新', ru:'Обновить',
    ar:'تحديث', ja:'更新', ko:'업데이트',
  },
  btn_retry: {
    es:'Reintentar', en:'Retry', fr:'Réessayer', it:'Riprova',
    de:'Wiederholen', pt:'Tentar novamente', zh:'重试', ru:'Повторить',
    ar:'إعادة المحاولة', ja:'再試行', ko:'재시도',
  },
  btn_save: {
    es:'Guardar', en:'Save', fr:'Enregistrer', it:'Salva',
    de:'Speichern', pt:'Salvar', zh:'保存', ru:'Сохранить',
    ar:'حفظ', ja:'保存', ko:'저장',
  },
  btn_cancel: {
    es:'Cancelar', en:'Cancel', fr:'Annuler', it:'Annulla',
    de:'Abbrechen', pt:'Cancelar', zh:'取消', ru:'Отмена',
    ar:'إلغاء', ja:'キャンセル', ko:'취소',
  },
  btn_create: {
    es:'Crear', en:'Create', fr:'Créer', it:'Crea',
    de:'Erstellen', pt:'Criar', zh:'创建', ru:'Создать',
    ar:'إنشاء', ja:'作成', ko:'만들기',
  },
  btn_add_sector: {
    es:'Agregar sector', en:'Add sector', fr:'Ajouter secteur', it:'Aggiungi settore',
    de:'Sektor hinzufügen', pt:'Adicionar setor', zh:'添加板块', ru:'Добавить сектор',
    ar:'إضافة قطاع', ja:'セクター追加', ko:'섹터 추가',
  },
  btn_search: {
    es:'Buscar', en:'Search', fr:'Rechercher', it:'Cerca',
    de:'Suchen', pt:'Buscar', zh:'搜索', ru:'Поиск',
    ar:'بحث', ja:'検索', ko:'검색',
  },

  // ── Comparador labels ──
  label_sectors: {
    es:'Sectores', en:'Sectors', fr:'Secteurs', it:'Settori',
    de:'Sektoren', pt:'Setores', zh:'板块', ru:'Секторы',
    ar:'القطاعات', ja:'セクター', ko:'섹터',
  },
  label_companies: {
    es:'Empresas', en:'Companies', fr:'Entreprises', it:'Aziende',
    de:'Unternehmen', pt:'Empresas', zh:'公司', ru:'Компании',
    ar:'الشركات', ja:'企業', ko:'기업',
  },
  label_current_price: {
    es:'Precio Actual', en:'Current Price', fr:'Prix actuel', it:'Prezzo attuale',
    de:'Aktueller Preis', pt:'Preço atual', zh:'当前价格', ru:'Текущая цена',
    ar:'السعر الحالي', ja:'現在価格', ko:'현재 가격',
  },
  label_average: {
    es:'Promedio', en:'Average', fr:'Moyenne', it:'Media',
    de:'Durchschnitt', pt:'Média', zh:'平均', ru:'Среднее',
    ar:'المتوسط', ja:'平均', ko:'평균',
  },
  label_change: {
    es:'Cambio', en:'Change', fr:'Variation', it:'Variazione',
    de:'Änderung', pt:'Variação', zh:'变化', ru:'Изменение',
    ar:'التغيير', ja:'変化', ko:'변화',
  },
  label_min: {
    es:'Mín', en:'Min', fr:'Min', it:'Min',
    de:'Min', pt:'Mín', zh:'最低', ru:'Мин',
    ar:'أدنى', ja:'最安値', ko:'최저',
  },
  label_max: {
    es:'Máx', en:'Max', fr:'Max', it:'Max',
    de:'Max', pt:'Máx', zh:'最高', ru:'Макс',
    ar:'أعلى', ja:'最高値', ko:'최고',
  },
  label_open: {
    es:'Apertura', en:'Open', fr:'Ouverture', it:'Apertura',
    de:'Eröffnung', pt:'Abertura', zh:'开盘', ru:'Открытие',
    ar:'الافتتاح', ja:'始値', ko:'시가',
  },
  label_day_high: {
    es:'Máx. día', en:'Day High', fr:'Haut du jour', it:'Massimo giornaliero',
    de:'Tageshoch', pt:'Máx. dia', zh:'日内最高', ru:'Макс. дня',
    ar:'أعلى اليوم', ja:'日中高値', ko:'일중 최고',
  },
  label_day_low: {
    es:'Mín. día', en:'Day Low', fr:'Bas du jour', it:'Minimo giornaliero',
    de:'Tagestief', pt:'Mín. dia', zh:'日内最低', ru:'Мин. дня',
    ar:'أدنى اليوم', ja:'日中安値', ko:'일중 최저',
  },
  label_volume: {
    es:'Vol.', en:'Vol.', fr:'Vol.', it:'Vol.',
    de:'Vol.', pt:'Vol.', zh:'成交量', ru:'Объём',
    ar:'الحجم', ja:'出来高', ko:'거래량',
  },
  label_avg_volume: {
    es:'V. medio', en:'Avg Vol.', fr:'Vol. moy.', it:'Vol. medio',
    de:'Ø Volumen', pt:'Vol. médio', zh:'均量', ru:'Ср. объём',
    ar:'متوسط الحجم', ja:'平均出来高', ko:'평균 거래량',
  },
  label_market_cap: {
    es:'Cap. merc.', en:'Mkt Cap', fr:'Cap. boursière', it:'Cap. mercato',
    de:'Marktkapital.', pt:'Cap. mercado', zh:'市值', ru:'Капитализация',
    ar:'القيمة السوقية', ja:'時価総額', ko:'시가총액',
  },
  label_week52_high: {
    es:'Máx. 52S', en:'52W High', fr:'Haut 52S', it:'Max 52S',
    de:'52W Hoch', pt:'Máx. 52S', zh:'52周最高', ru:'Макс. 52н',
    ar:'أعلى 52 أسبوع', ja:'52週高値', ko:'52주 최고',
  },
  label_week52_low: {
    es:'Mín. 52S', en:'52W Low', fr:'Bas 52S', it:'Min 52S',
    de:'52W Tief', pt:'Mín. 52S', zh:'52周最低', ru:'Мин. 52н',
    ar:'أدنى 52 أسبوع', ja:'52週安値', ko:'52주 최저',
  },
  label_beta: {
    es:'Beta', en:'Beta', fr:'Bêta', it:'Beta',
    de:'Beta', pt:'Beta', zh:'贝塔', ru:'Бета',
    ar:'بيتا', ja:'ベータ', ko:'베타',
  },
  label_fundamentals: {
    es:'Datos Fundamentales', en:'Fundamentals', fr:'Données fondamentales', it:'Dati fondamentali',
    de:'Fundamentaldaten', pt:'Dados fundamentais', zh:'基本面数据', ru:'Фундаментальные данные',
    ar:'البيانات الأساسية', ja:'ファンダメンタルズ', ko:'기본 데이터',
  },
  label_comparison: {
    es:'Comparación', en:'Comparison', fr:'Comparaison', it:'Confronto',
    de:'Vergleich', pt:'Comparação', zh:'比较', ru:'Сравнение',
    ar:'المقارنة', ja:'比較', ko:'비교',
  },
  label_news: {
    es:'📰 Noticias', en:'📰 News', fr:'📰 Actualités', it:'📰 Notizie',
    de:'📰 Nachrichten', pt:'📰 Notícias', zh:'📰 新闻', ru:'📰 Новости',
    ar:'📰 الأخبار', ja:'📰 ニュース', ko:'📰 뉴스',
  },
  label_loading: {
    es:'Cargando datos del mercado...', en:'Loading market data...', fr:'Chargement des données...', it:'Caricamento dati...',
    de:'Marktdaten laden...', pt:'Carregando dados...', zh:'加载市场数据...', ru:'Загрузка данных...',
    ar:'جارٍ تحميل البيانات...', ja:'市場データを読み込み中...', ko:'시장 데이터 로딩 중...',
  },
  label_select_stocks: {
    es:'Selecciona acciones para ver la comparación', en:'Select stocks to view comparison',
    fr:'Sélectionnez des actions', it:'Seleziona azioni per il confronto',
    de:'Aktien auswählen', pt:'Selecione ações para comparar',
    zh:'选择股票查看比较', ru:'Выберите акции для сравнения',
    ar:'اختر الأسهم للمقارنة', ja:'株式を選択して比較', ko:'비교할 주식을 선택하세요',
  },

  // ── Portfolio labels ──
  label_portfolio_title: {
    es:'Simulador de Portafolio', en:'Portfolio Simulator', fr:'Simulateur de portefeuille', it:'Simulatore di portafoglio',
    de:'Portfolio-Simulator', pt:'Simulador de portfólio', zh:'投资组合模拟器', ru:'Симулятор портфеля',
    ar:'محاكي المحفظة', ja:'ポートフォリオシミュレーター', ko:'포트폴리오 시뮬레이터',
  },
  label_total_value: {
    es:'Valor Total', en:'Total Value', fr:'Valeur totale', it:'Valore totale',
    de:'Gesamtwert', pt:'Valor total', zh:'总价值', ru:'Общая стоимость',
    ar:'القيمة الإجمالية', ja:'総価値', ko:'총 가치',
  },
  label_cash: {
    es:'Efectivo', en:'Cash', fr:'Liquidités', it:'Contanti',
    de:'Bargeld', pt:'Dinheiro', zh:'现金', ru:'Наличные',
    ar:'النقد', ja:'現金', ko:'현금',
  },
  label_investments: {
    es:'Inversiones', en:'Investments', fr:'Investissements', it:'Investimenti',
    de:'Investitionen', pt:'Investimentos', zh:'投资', ru:'Инвестиции',
    ar:'الاستثمارات', ja:'投資', ko:'투자',
  },
  label_total_return: {
    es:'Retorno Total', en:'Total Return', fr:'Rendement total', it:'Rendimento totale',
    de:'Gesamtrendite', pt:'Retorno total', zh:'总回报', ru:'Общая доходность',
    ar:'العائد الإجمالي', ja:'総リターン', ko:'총 수익',
  },
  label_buy: {
    es:'Comprar', en:'Buy', fr:'Acheter', it:'Acquistare',
    de:'Kaufen', pt:'Comprar', zh:'买入', ru:'Купить',
    ar:'شراء', ja:'買い', ko:'매수',
  },
  label_sell: {
    es:'Vender', en:'Sell', fr:'Vendre', it:'Vendere',
    de:'Verkaufen', pt:'Vender', zh:'卖出', ru:'Продать',
    ar:'بيع', ja:'売り', ko:'매도',
  },
  label_deposit: {
    es:'Depositar', en:'Deposit', fr:'Déposer', it:'Depositare',
    de:'Einzahlen', pt:'Depositar', zh:'存款', ru:'Пополнить',
    ar:'إيداع', ja:'入金', ko:'입금',
  },
  label_withdraw: {
    es:'Retirar', en:'Withdraw', fr:'Retirer', it:'Prelevare',
    de:'Abheben', pt:'Retirar', zh:'取款', ru:'Вывести',
    ar:'سحب', ja:'出金', ko:'출금',
  },
  label_positions: {
    es:'Posiciones', en:'Positions', fr:'Positions', it:'Posizioni',
    de:'Positionen', pt:'Posições', zh:'持仓', ru:'Позиции',
    ar:'المراكز', ja:'ポジション', ko:'포지션',
  },
  label_transactions: {
    es:'Historial de Transacciones', en:'Transaction History', fr:'Historique des transactions', it:'Storico transazioni',
    de:'Transaktionsverlauf', pt:'Histórico de transações', zh:'交易历史', ru:'История транзакций',
    ar:'سجل المعاملات', ja:'取引履歴', ko:'거래 내역',
  },

  // ── Settings labels ──
  settings_title: {
    es:'Ajustes', en:'Settings', fr:'Paramètres', it:'Impostazioni',
    de:'Einstellungen', pt:'Configurações', zh:'设置', ru:'Настройки',
    ar:'الإعدادات', ja:'設定', ko:'설정',
  },
  settings_language: {
    es:'Idioma', en:'Language', fr:'Langue', it:'Lingua',
    de:'Sprache', pt:'Idioma', zh:'语言', ru:'Язык',
    ar:'اللغة', ja:'言語', ko:'언어',
  },
  settings_timezone: {
    es:'Zona horaria', en:'Timezone', fr:'Fuseau horaire', it:'Fuso orario',
    de:'Zeitzone', pt:'Fuso horário', zh:'时区', ru:'Часовой пояс',
    ar:'المنطقة الزمنية', ja:'タイムゾーン', ko:'시간대',
  },
  settings_currencies: {
    es:'Monedas en rotación', en:'Currency rotation', fr:'Rotation des devises', it:'Rotazione valute',
    de:'Währungsrotation', pt:'Rotação de moedas', zh:'货币轮换', ru:'Ротация валют',
    ar:'تدوير العملات', ja:'通貨ローテーション', ko:'통화 순환',
  },
  settings_tz_search: {
    es:'Buscar zona horaria...', en:'Search timezone...', fr:'Rechercher un fuseau...', it:'Cerca fuso orario...',
    de:'Zeitzone suchen...', pt:'Buscar fuso horário...', zh:'搜索时区...', ru:'Поиск часового пояса...',
    ar:'البحث عن منطقة زمنية...', ja:'タイムゾーンを検索...', ko:'시간대 검색...',
  },
  settings_nyse: {
    es:'NYSE:', en:'NYSE:', fr:'NYSE:', it:'NYSE:',
    de:'NYSE:', pt:'NYSE:', zh:'纽交所:', ru:'NYSE:',
    ar:'بورصة نيويورك:', ja:'NYSE:', ko:'NYSE:',
  },
};

export function t(key, lang) {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang] ?? entry['es'] ?? key;
}
