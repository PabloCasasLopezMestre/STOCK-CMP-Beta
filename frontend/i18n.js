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
  nav_community: {
    es:'Comunidad', en:'Community', fr:'Communauté', it:'Comunità',
    de:'Community', pt:'Comunidade', zh:'社区', ru:'Сообщество',
    ar:'المجتمع', ja:'コミュニティ', ko:'커뮤니티',
  },
  nav_settings: {
    es:'Ajustes', en:'Settings', fr:'Paramètres', it:'Impostazioni',
    de:'Einstellungen', pt:'Configurações', zh:'设置', ru:'Настройки',
    ar:'الإعدادات', ja:'設定', ko:'설정',
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
    es:'Noticias', en:'News', fr:'Actualités', it:'Notizie',
    de:'Nachrichten', pt:'Notícias', zh:'新闻', ru:'Новости',
    ar:'الأخبار', ja:'ニュース', ko:'뉴스',
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
  auth_loading: {
    es:'Cargando sesión…', en:'Loading session…', fr:'Chargement…', it:'Caricamento…',
    de:'Laden…', pt:'Carregando…', zh:'加载会话…', ru:'Загрузка…',
    ar:'جاري التحميل…', ja:'読み込み中…', ko:'세션 로드 중…',
  },
  auth_email_title: {
    es:'Cuenta con email', en:'Email account', fr:'Compte e-mail', it:'Account email',
    de:'E-Mail-Konto', pt:'Conta de email', zh:'邮箱账户', ru:'Аккаунт email',
    ar:'حساب البريد', ja:'メールアカウント', ko:'이메일 계정',
  },
  auth_email_hint: {
    es:'Te enviamos un enlace mágico (sin contraseña). Al abrirlo en este mismo navegador quedarás identificado.',
    en:'We send a magic link (no password). Opening it in this browser signs you in.',
    fr:'Lien magique par e-mail (sans mot de passe).', it:'Link magico via email.',
    de:'Magic Link per E-Mail (ohne Passwort).', pt:'Link mágico por email.', zh:'魔法链接登录，无需密码。',
    ru:'Волшебная ссылка на почте.', ar:'رابط سحري بالبريد.', ja:'マジックリンクでログイン', ko:'비밀번호 없이 이메일 링크로 로그인',
  },
  auth_email_label: {
    es:'Correo electrónico', en:'Email', fr:'E-mail', it:'Email', de:'E-Mail', pt:'E-mail', zh:'电子邮箱',
    ru:'Email', ar:'البريد', ja:'メール', ko:'이메일',
  },
  auth_send_link: {
    es:'Enviar enlace de acceso', en:'Send sign-in link', fr:'Envoyer le lien', it:'Invia link',
    de:'Link senden', pt:'Enviar link', zh:'发送登录链接', ru:'Отправить ссылку',
    ar:'إرسال الرابط', ja:'リンクを送る', ko:'로그인 링크 보내기',
  },
  auth_check_email: {
    es:'Revisa tu bandeja (y spam). Abre el enlace en este dispositivo para entrar.',
    en:'Check your inbox (and spam). Open the link on this device to sign in.',
    fr:'Vérifiez votre boîte mail.', it:'Controlla la posta.', de:'Postfach prüfen.',
    pt:'Verifique o email.', zh:'请查收邮件。', ru:'Проверьте почту.', ar:'تحقق من بريدك.', ja:'メールを確認してください。', ko:'메일함을 확인하세요.',
  },
  auth_bad_email: {
    es:'Introduce un correo válido.', en:'Enter a valid email.', fr:'E-mail invalide.', it:'Email non valida.',
    de:'Ungültige E-Mail.', pt:'Email inválido.', zh:'请输入有效邮箱。', ru:'Некорректный email.',
    ar:'بريد غير صالح.', ja:'有効なメールを入力', ko:'올바른 이메일을 입력하세요.',
  },
  auth_signed_in_as: {
    es:'Sesión iniciada como', en:'Signed in as', fr:'Connecté en tant que', it:'Accesso come',
    de:'Angemeldet als', pt:'Conectado como', zh:'已登录', ru:'Вход как',
    ar:'مسجّل الدخول كـ', ja:'ログイン中', ko:'로그인:',
  },
  auth_sign_out: {
    es:'Cerrar sesión', en:'Sign out', fr:'Se déconnecter', it:'Esci', de:'Abmelden', pt:'Sair', zh:'退出登录',
    ru:'Выйти', ar:'تسجيل الخروج', ja:'ログアウト', ko:'로그아웃',
  },
  auth_anonymous_note: {
    es:'Ahora estás en modo anónimo. Con el enlace por email tendrás la misma cuenta en otros dispositivos.',
    en:'You are anonymous now. Email sign-in keeps your account across devices.',
    fr:'Vous êtes anonyme. L’e-mail lie votre compte.', it:'Sei anonimo. L’email collega l’account.',
    de:'Anonym. E-Mail verknüpft das Konto.', pt:'Modo anônimo. O email vincula a conta.',
    zh:'当前为匿名。使用邮箱可在多设备同步账户。', ru:'Сейчас анонимно. Email привяжет аккаунт.',
    ar:'وضع مجهول. يربط البريد حسابك.', ja:'匿名セッション中。メールで端末間で同期。', ko:'익명 세션입니다. 이메일로 기기 간 계정을 유지합니다.',
  },
  auth_supabase_config_note: {
    es:'En Supabase: Authentication → URL configuration → añade Redirect URLs: http://localhost:5173 y la URL de producción.',
    en:'In Supabase: Authentication → URL configuration → add Redirect URLs: http://localhost:5173 and your production URL.',
    fr:'Supabase → Authentication → URL : ajoutez http://localhost:5173.', it:'Supabase → URL di redirect.',
    de:'Supabase → Redirect-URLs eintragen.', pt:'Supabase → URLs de redirecionamento.',
    zh:'在 Supabase 认证设置中添加重定向 URL。', ru:'В Supabase добавьте Redirect URLs.',
    ar:'أضف عناوين إعادة التوجيه في Supabase.', ja:'Supabase の Redirect URL を設定。', ko:'Supabase에 리디렉션 URL을 등록하세요.',
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

  // ── Comunidad ──
  community_title: {
    es:'Comunidad STOCK-CMP', en:'STOCK-CMP Community', fr:'Communauté STOCK-CMP', it:'Comunità STOCK-CMP',
    de:'STOCK-CMP Community', pt:'Comunidade STOCK-CMP', zh:'STOCK-CMP 社区', ru:'Сообщество STOCK-CMP',
    ar:'مجتمع STOCK-CMP', ja:'STOCK-CMP コミュニティ', ko:'STOCK-CMP 커뮤니티',
  },
  community_subtitle: {
    es:'Ideas, análisis y debate',
    en:'Ideas, analysis and debate',
    fr:'Idées, analyses et débat',
    it:'Idee, analisi e dibattito',
    de:'Ideen, Analysen und Debatte',
    pt:'Ideias, análises e debate',
    zh:'想法、分析与讨论',
    ru:'Идеи, анализ и дискуссии',
    ar:'أفكار وتحليلات ونقاش',
    ja:'アイデア、分析、ディベート',
    ko:'아이디어, 분석 및 토론',
  },
  community_new_idea: {
    es:'+ Nueva idea', en:'+ New idea', fr:'+ Nouvelle idée', it:'+ Nuova idea',
    de:'+ Neue Idee', pt:'+ Nova ideia', zh:'+ 新观点', ru:'+ Новая идея',
    ar:'+ فكرة جديدة', ja:'+ 新しいアイデア', ko:'+ 새 아이디어',
  },
  community_sort_recent: {
    es:'Recientes', en:'Recent', fr:'Récentes', it:'Recenti',
    de:'Neu', pt:'Recentes', zh:'最新', ru:'Свежие',
    ar:'الأحدث', ja:'新着', ko:'최신',
  },
  community_sort_popular: {
    es:'Populares', en:'Popular', fr:'Populaires', it:'Popolari',
    de:'Beliebt', pt:'Populares', zh:'热门', ru:'Популярные',
    ar:'الأكثر شعبية', ja:'人気', ko:'인기',
  },
  community_trending: {
    es:'Tickers en tendencia', en:'Trending tickers', fr:'Tickers tendance', it:'Ticker di tendenza',
    de:'Trend-Ticker', pt:'Tickers em alta', zh:'热门代码', ru:'Трендовые тикеры',
    ar:'الرموز الرائجة', ja:'注目ティッカー', ko:'인기 티커',
  },
  community_env_hint: {
    es:'Falta configuración o el .env no se lee: en worker/proxy crea .env junto a vite.config.js con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (Supabase → Settings → API). Plantilla: .env.example. Arranca con "npm run dev" desde worker/proxy (ya levanta API + interfaz) y abre http://localhost:5173. Solo API: "npm run dev:api".',
    en:'Missing config or .env not loaded: create worker/proxy/.env next to vite.config.js with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Supabase → Settings → API). See .env.example. From worker/proxy run npm run dev (starts API + UI) and open http://localhost:5173. API only: npm run dev:api.',
    fr:'Créez worker/proxy/.env (voir .env.example). Depuis worker/proxy: npm run dev puis http://localhost:5173. API seule: npm run dev:api.',
    it:'Crea worker/proxy/.env (.env.example). Da worker/proxy: npm run dev e http://localhost:5173. Solo API: npm run dev:api.',
    de:'worker/proxy/.env anlegen (.env.example). npm run dev und http://localhost:5173. Nur API: npm run dev:api.',
    pt:'Crie worker/proxy/.env (.env.example). npm run dev e http://localhost:5173. Só API: npm run dev:api.',
    zh:'创建 worker/proxy/.env。在此目录执行 npm run dev，打开 http://localhost:5173。仅 API：npm run dev:api。',
    ru:'Создайте worker/proxy/.env. npm run dev и http://localhost:5173. Только API: npm run dev:api.',
    ar:'أنشئ worker/proxy/.env. نفّذ npm run dev وافتح http://localhost:5173. للـ API فقط: npm run dev:api.',
    ja:'worker/proxy/.env を作成。npm run dev で http://localhost:5173。API のみ: npm run dev:api。',
    ko:'worker/proxy/.env 생성. npm run dev 후 http://localhost:5173. API만: npm run dev:api.',
  },
  community_auth_error: {
    es:'No se pudo iniciar sesión anónima. En Supabase: Authentication → Providers → activa "Anonymous sign-ins".',
    en:'Anonymous sign-in failed. In Supabase enable Authentication → Providers → Anonymous sign-ins.',
    fr:'Connexion anonyme impossible. Activez Anonymous sign-ins.', it:'Abilita Anonymous sign-ins in Supabase.',
    de:'Anonyme Anmeldung fehlgeschlagen.', pt:'Ative sign-ins anônimos no Supabase.', zh:'请在 Supabase 启用匿名登录。',
    ru:'Включите анонимный вход в Supabase.', ar:'فعّل تسجيل الدخول المجهول.', ja:'Supabase で匿名サインインを有効にしてください。', ko:'Supabase에서 익명 로그인을 켜세요.',
  },
  community_tickers_label: {
    es:'Tickers (hasta 5, separados por coma)', en:'Tickers (up to 5, comma-separated)', fr:'Tickers (5 max)', it:'Ticker (max 5)',
    de:'Ticker (max. 5)', pt:'Tickers (até 5)', zh:'代码（最多5个）', ru:'Тикеры (до 5)',
    ar:'الرموز (حتى 5)', ja:'ティッカー（最大5）', ko:'티커(최대 5개)',
  },
  community_body_label: {
    es:'Tu análisis (máx. 500 caracteres)', en:'Your analysis (max 500 chars)', fr:'Analyse (500 car. max)', it:'Analisi (max 500)',
    de:'Analyse (max. 500)', pt:'Análise (máx. 500)', zh:'分析（最多500字）', ru:'Анализ (до 500)',
    ar:'التحليل (500 حرفًا)', ja:'分析（500文字まで）', ko:'분석(최대 500자)',
  },
  community_sentiment: {
    es:'Sentimiento', en:'Sentiment', fr:'Sentiment', it:'Sentimento',
    de:'Stimmung', pt:'Sentimento', zh:'观点', ru:'Настроение',
    ar:'المشاعر', ja:'センチメント', ko:'센티먼트',
  },
  community_bullish: {
    es:'Bullish', en:'Bullish', fr:'Haussier', it:'Rialzista',
    de:'Bullish', pt:'Alta', zh:'看涨', ru:'Бычий',
    ar:'صاعد', ja:'強気', ko:'상승',
  },
  community_bearish: {
    es:'Bearish', en:'Bearish', fr:'Baissier', it:'Ribassista',
    de:'Bearish', pt:'Baixa', zh:'看跌', ru:'Медвежий',
    ar:'هابط', ja:'弱気', ko:'하락',
  },
  community_neutral: {
    es:'Neutral', en:'Neutral', fr:'Neutre', it:'Neutrale',
    de:'Neutral', pt:'Neutro', zh:'中性', ru:'Нейтрально',
    ar:'محايد', ja:'中立', ko:'중립',
  },
  community_chart_url: {
    es:'URL de captura (opcional)', en:'Chart image URL (optional)', fr:'URL capture (optionnel)', it:'URL grafico (opz.)',
    de:'Chart-URL (optional)', pt:'URL do gráfico (opcional)', zh:'图表链接（可选）', ru:'URL графика (необяз.)',
    ar:'رابط لقطة (اختياري)', ja:'チャートURL（任意）', ko:'차트 URL(선택)',
  },
  community_publish: {
    es:'Publicar', en:'Publish', fr:'Publier', it:'Pubblica',
    de:'Veröffentlichen', pt:'Publicar', zh:'发布', ru:'Опубликовать',
    ar:'نشر', ja:'投稿', ko:'게시',
  },
  community_empty: {
    es:'Aún no hay ideas. ¡Sé el primero en publicar!',
    en:'No ideas yet. Be the first to post!',
    fr:'Pas encore d’idées.', it:'Nessuna idea ancora.',
    de:'Noch keine Ideen.', pt:'Nenhuma ideia ainda.', zh:'暂无内容。',
    ru:'Пока нет идей.', ar:'لا توجد أفكار بعد.', ja:'まだ投稿がありません。', ko:'아직 글이 없습니다.',
  },
  community_loading: {
    es:'Cargando…', en:'Loading…', fr:'Chargement…', it:'Caricamento…',
    de:'Laden…', pt:'Carregando…', zh:'加载中…', ru:'Загрузка…',
    ar:'جاري التحميل…', ja:'読み込み中…', ko:'불러오는 중…',
  },
  community_share_idea: {
    es:'Idea', en:'Idea', fr:'Idée', it:'Idea',
    de:'Idee', pt:'Ideia', zh:'观点', ru:'Идея',
    ar:'فكرة', ja:'アイデア', ko:'아이디어',
  },
  settings_profile_community: {
    es:'Perfil en Comunidad', en:'Community profile', fr:'Profil communauté', it:'Profilo comunità',
    de:'Community-Profil', pt:'Perfil na comunidade', zh:'社区资料', ru:'Профиль в сообществе',
    ar:'الملف في المجتمع', ja:'コミュニティプロフィール', ko:'커뮤니티 프로필',
  },
  settings_profile_community_hint: {
    es:'Así te verán otros en el feed de ideas. Cada visitante tiene una cuenta anónima hasta que actives email o Google en Supabase.',
    en:'How others see you in the ideas feed. Each visitor gets an anonymous account until you enable email or Google in Supabase.',
    fr:'Visible dans le fil d’idées.', it:'Come ti vedono nel feed.', de:'So sehen dich andere im Feed.',
    pt:'Como outros te veem no feed.', zh:'在社区信息流中展示。', ru:'Как вас видят в ленте.',
    ar:'كما يظهر لك الآخرون.', ja:'フィードでの表示名。', ko:'피드에 보이는 정보.',
  },
  profile_loading: {
    es:'Cargando perfil…', en:'Loading profile…', fr:'Chargement…', it:'Caricamento…',
    de:'Laden…', pt:'Carregando…', zh:'加载中…', ru:'Загрузка…',
    ar:'جاري التحميل…', ja:'読み込み中…', ko:'불러오는 중…',
  },
  profile_migration_needed: {
    es:'Ejecuta en Supabase SQL Editor el archivo supabase/migrations/20260412000000_profiles_public_fields.sql para activar biografía, foto y país.',
    en:'Run supabase/migrations/20260412000000_profiles_public_fields.sql in the Supabase SQL Editor to enable bio, avatar, and country.',
    fr:'Exécutez la migration SQL pour bio / avatar.', it:'Esegui la migration SQL per bio e avatar.',
    de:'SQL-Migration für Bio/Avatar ausführen.', pt:'Execute a migration SQL para bio e avatar.',
    zh:'在 Supabase 运行迁移 SQL 以启用简介和头像。', ru:'Выполните SQL-миграцию для био и аватара.',
    ar:'شغّل ملف SQL لإضافة الحقول.', ja:'SQLマイグレーションを実行してください。', ko:'SQL 마이그레이션을 실행하세요.',
  },
  profile_saved: {
    es:'Perfil guardado.', en:'Profile saved.', fr:'Profil enregistré.', it:'Profilo salvato.',
    de:'Gespeichert.', pt:'Perfil salvo.', zh:'已保存。', ru:'Сохранено.',
    ar:'تم الحفظ.', ja:'保存しました。', ko:'저장됨.',
  },
  profile_bad_handle: {
    es:'El @handle debe tener 3–30 caracteres: letras minúsculas, números o _',
    en:'Handle must be 3–30 chars: lowercase letters, numbers, or underscore',
    fr:'3–30 caractères, minuscules et _', it:'3–30 caratteri, minuscole e _',
    de:'3–30 Zeichen, klein und _', pt:'3–30 caracteres, minúsculas e _',
    zh:'3–30 个小写字母、数字或下划线', ru:'3–30 символов: a-z, цифры, _',
    ar:'٣–٣٠ حرفًا صغيرًا أو رقمًا أو _', ja:'3〜30文字（小文字・数字・_）', ko:'3–30자(소문자·숫자·_)',
  },
  profile_handle_taken: {
    es:'Ese @handle ya está en uso. Prueba otro.', en:'That handle is taken. Try another.',
    fr:'Ce pseudo est pris.', it:'Handle già usato.', de:'Handle vergeben.', pt:'Handle em uso.',
    zh:'该用户名已被占用。', ru:'Ник занят.', ar:'الاسم مستخدم.', ja:'使用中のハンドルです。', ko:'이미 사용 중입니다.',
  },
  profile_display_name: {
    es:'Nombre para mostrar', en:'Display name', fr:'Nom affiché', it:'Nome visualizzato',
    de:'Anzeigename', pt:'Nome exibido', zh:'显示名称', ru:'Отображаемое имя',
    ar:'الاسم المعروض', ja:'表示名', ko:'표시 이름',
  },
  profile_handle: {
    es:'Usuario (@handle)', en:'Username (@handle)', fr:'Pseudo (@handle)', it:'Handle',
    de:'Benutzername', pt:'Usuário (@handle)', zh:'用户名', ru:'Ник',
    ar:'المعرّف', ja:'ハンドル', ko:'핸들',
  },
  profile_handle_hint: {
    es:'Único en la comunidad. Solo minúsculas, números y guion bajo.',
    en:'Unique in the community. Lowercase, numbers, underscore only.',
    fr:'Unique, minuscules et _', it:'Unico nella community.', de:'Eindeutig.', pt:'Único na comunidade.',
    zh:'社区内唯一', ru:'Уникальный в сообществе', ar:'فريد', ja:'コミュニティ内で一意', ko:'커뮤니티 내 고유',
  },
  profile_bio: {
    es:'Biografía (opcional)', en:'Bio (optional)', fr:'Bio', it:'Bio', de:'Bio', pt:'Bio', zh:'简介',
    ru:'О себе', ar:'نبذة', ja:'自己紹介', ko:'소개',
  },
  profile_avatar: {
    es:'URL de foto de perfil (opcional)', en:'Profile image URL (optional)', fr:'URL avatar', it:'URL immagine',
    de:'Avatar-URL', pt:'URL da foto', zh:'头像链接', ru:'URL аватара', ar:'رابط الصورة', ja:'画像URL', ko:'프로필 이미지 URL',
  },
  profile_country: {
    es:'País o ciudad (opcional)', en:'Country or city (optional)', fr:'Pays / ville', it:'Paese / città',
    de:'Land / Stadt', pt:'País ou cidade', zh:'国家或城市', ru:'Страна / город', ar:'البلد', ja:'国・都市', ko:'국가/도시',
  },
  profile_save: {
    es:'Guardar perfil', en:'Save profile', fr:'Enregistrer', it:'Salva', de:'Speichern', pt:'Salvar', zh:'保存',
    ru:'Сохранить', ar:'حفظ', ja:'保存', ko:'저장',
  },
  community_coming: {
    es:'Próximamente: comentarios anidados, chat NYSE, alertas y ranking.',
    en:'Coming soon: nested comments, NYSE chat, alerts, and rankings.',
    fr:'Bientôt : commentaires, chat NYSE…', it:'Presto: commenti, chat NYSE…',
    de:'Demnächst: Kommentare, NYSE-Chat…', pt:'Em breve: comentários, chat…', zh:'即将推出：评论、聊天等。',
    ru:'Скоро: комментарии, чат NYSE…', ar:'قريبًا: تعليقات ودردشة…', ja:'近日：コメント、NYSEチャット…', ko:'곧: 댓글, NYSE 채팅…',
  },

  // ── Chat / Mensajes ──
  chat_messages_tab: {
    es:'Mensajes', en:'Messages', fr:'Messages', it:'Messaggi',
    de:'Nachrichten', pt:'Mensagens', zh:'消息', ru:'Сообщения', ar:'الرسائل', ja:'メッセージ', ko:'메시지',
  },
  chat_require_email: {
    es:'Necesitas una cuenta con email para acceder al chat.',
    en:'You need an email account to access the chat.',
    fr:'Vous avez besoin d\'un compte email pour accéder au chat.',
    it:'Hai bisogno di un account email per accedere alla chat.',
    de:'Sie benötigen ein E-Mail-Konto, um auf den Chat zuzugreifen.',
    pt:'Você precisa de uma conta de email para acessar o chat.',
    zh:'您需要一个电子邮件账户才能访问聊天。',
    ru:'Вам нужен аккаунт с email для доступа к чату.',
    ar:'تحتاج إلى حساب بريد إلكتروني للوصول إلى الدردشة.',
    ja:'チャットにアクセスするにはメールアカウントが必要です。',
    ko:'채팅에 접근하려면 이메일 계정이 필요합니다.',
  },
  chat_loading: {
    es:'Cargando…', en:'Loading…', fr:'Chargement…', it:'Caricamento…',
    de:'Laden…', pt:'Carregando…', zh:'加载中…', ru:'Загрузка…', ar:'جارٍ التحميل…', ja:'読み込み中…', ko:'로딩 중…',
  },
  chat_empty_conversations: {
    es:'Aún no tienes conversaciones. Busca un trader para empezar.',
    en:"You don't have any conversations yet. Search for a trader to start.",
    fr:"Vous n'avez pas encore de conversations. Recherchez un trader pour commencer.",
    it:'Non hai ancora conversazioni. Cerca un trader per iniziare.',
    de:'Sie haben noch keine Gespräche. Suchen Sie einen Trader, um zu beginnen.',
    pt:'Você ainda não tem conversas. Procure um trader para começar.',
    zh:'您还没有对话。搜索交易者开始。',
    ru:'У вас пока нет разговоров. Найдите трейдера, чтобы начать.',
    ar:'ليس لديك محادثات بعد. ابحث عن متداول للبدء.',
    ja:'まだ会話がありません。トレーダーを検索して始めましょう。',
    ko:'아직 대화가 없습니다. 트레이더를 검색하여 시작하세요.',
  },
  chat_no_messages_yet: {
    es:'Sin mensajes aún', en:'No messages yet', fr:'Pas encore de messages',
    it:'Nessun messaggio ancora', de:'Noch keine Nachrichten', pt:'Sem mensagens ainda',
    zh:'暂无消息', ru:'Сообщений пока нет', ar:'لا رسائل بعد', ja:'まだメッセージなし', ko:'아직 메시지 없음',
  },
  chat_loading_messages: {
    es:'Cargando mensajes…', en:'Loading messages…', fr:'Chargement des messages…',
    it:'Caricamento messaggi…', de:'Nachrichten laden…', pt:'Carregando mensagens…',
    zh:'加载消息中…', ru:'Загрузка сообщений…', ar:'جارٍ تحميل الرسائل…', ja:'メッセージ読み込み中…', ko:'메시지 로딩 중…',
  },
  chat_no_messages_start: {
    es:'Aún no hay mensajes. ¡Empieza la conversación!',
    en:'No messages yet. Start the conversation!',
    fr:'Pas encore de messages. Commencez la conversation !',
    it:'Nessun messaggio ancora. Inizia la conversazione!',
    de:'Noch keine Nachrichten. Starten Sie das Gespräch!',
    pt:'Ainda sem mensagens. Comece a conversa!',
    zh:'还没有消息。开始对话吧！',
    ru:'Сообщений пока нет. Начните разговор!',
    ar:'لا رسائل بعد. ابدأ المحادثة!',
    ja:'まだメッセージがありません。会話を始めましょう！',
    ko:'아직 메시지가 없습니다. 대화를 시작하세요!',
  },
  chat_type_message: {
    es:'Escribe un mensaje…', en:'Type a message…', fr:'Écrivez un message…',
    it:'Scrivi un messaggio…', de:'Nachricht schreiben…', pt:'Escreva uma mensagem…',
    zh:'输入消息…', ru:'Напишите сообщение…', ar:'اكتب رسالة…', ja:'メッセージを入力…', ko:'메시지 입력…',
  },
  chat_send: {
    es:'Enviar', en:'Send', fr:'Envoyer', it:'Invia',
    de:'Senden', pt:'Enviar', zh:'发送', ru:'Отправить', ar:'إرسال', ja:'送信', ko:'보내기',
  },
  chat_send_error: {
    es:'Error al enviar el mensaje.', en:'Failed to send message.',
    fr:'Erreur lors de l\'envoi.', it:'Errore nell\'invio.',
    de:'Fehler beim Senden.', pt:'Erro ao enviar mensagem.',
    zh:'发送消息失败。', ru:'Ошибка отправки сообщения.',
    ar:'فشل إرسال الرسالة.', ja:'メッセージの送信に失敗しました。', ko:'메시지 전송 실패.',
  },
  chat_close: {
    es:'Cerrar chat', en:'Close chat', fr:'Fermer le chat', it:'Chiudi chat',
    de:'Chat schließen', pt:'Fechar chat', zh:'关闭聊天', ru:'Закрыть чат', ar:'إغلاق الدردشة', ja:'チャットを閉じる', ko:'채팅 닫기',
  },

  // ── ProfileViewer ──
  profile_viewer_title: {
    es:'Perfil del trader', en:'Trader profile', fr:'Profil du trader', it:'Profilo del trader',
    de:'Trader-Profil', pt:'Perfil do trader', zh:'交易者资料', ru:'Профиль трейдера',
    ar:'ملف المتداول', ja:'トレーダープロフィール', ko:'트레이더 프로필',
  },
  profile_viewer_close: {
    es:'Cerrar', en:'Close', fr:'Fermer', it:'Chiudi',
    de:'Schließen', pt:'Fechar', zh:'关闭', ru:'Закрыть', ar:'إغلاق', ja:'閉じる', ko:'닫기',
  },
  profile_viewer_loading: {
    es:'Cargando perfil…', en:'Loading profile…', fr:'Chargement du profil…', it:'Caricamento profilo…',
    de:'Profil laden…', pt:'Carregando perfil…', zh:'加载资料中…', ru:'Загрузка профиля…',
    ar:'جارٍ تحميل الملف الشخصي…', ja:'プロフィール読み込み中…', ko:'프로필 로딩 중…',
  },
  profile_viewer_send_message: {
    es:'Enviar mensaje', en:'Send message', fr:'Envoyer un message', it:'Invia messaggio',
    de:'Nachricht senden', pt:'Enviar mensagem', zh:'发送消息', ru:'Отправить сообщение',
    ar:'إرسال رسالة', ja:'メッセージを送る', ko:'메시지 보내기',
  },
  profile_viewer_requires_email: {
    es:'Requiere cuenta con email', en:'Requires email account', fr:'Nécessite un compte email',
    it:'Richiede account email', de:'E-Mail-Konto erforderlich', pt:'Requer conta de email',
    zh:'需要电子邮件账户', ru:'Требуется аккаунт с email', ar:'يتطلب حساب بريد إلكتروني',
    ja:'メールアカウントが必要', ko:'이메일 계정 필요',
  },
  profile_viewer_latest_ideas: {
    es:'Últimas ideas', en:'Latest ideas', fr:'Dernières idées', it:'Ultime idee',
    de:'Neueste Ideen', pt:'Últimas ideias', zh:'最新想法', ru:'Последние идеи',
    ar:'أحدث الأفكار', ja:'最新のアイデア', ko:'최신 아이디어',
  },
  profile_viewer_no_ideas: {
    es:'Sin ideas publicadas.', en:'No published ideas.', fr:'Aucune idée publiée.',
    it:'Nessuna idea pubblicata.', de:'Keine veröffentlichten Ideen.', pt:'Sem ideias publicadas.',
    zh:'没有发布的想法。', ru:'Нет опубликованных идей.', ar:'لا توجد أفكار منشورة.',
    ja:'公開されたアイデアはありません。', ko:'게시된 아이디어가 없습니다.',
  },
  profile_viewer_view_chart: {
    es:'Ver gráfico', en:'View chart', fr:'Voir le graphique', it:'Vedi grafico',
    de:'Diagramm anzeigen', pt:'Ver gráfico', zh:'查看图表', ru:'Посмотреть график',
    ar:'عرض الرسم البياني', ja:'チャートを見る', ko:'차트 보기',
  },

  // ── TraderSearch ──
  trader_search_placeholder: {
    es:'Buscar trader por @handle…', en:'Search trader by @handle…', fr:'Rechercher par @handle…',
    it:'Cerca trader per @handle…', de:'Trader nach @handle suchen…', pt:'Buscar trader por @handle…',
    zh:'按@handle搜索交易者…', ru:'Поиск трейдера по @handle…', ar:'البحث عن متداول بـ @handle…',
    ja:'@handleでトレーダーを検索…', ko:'@handle로 트레이더 검색…',
  },
  trader_search_not_found: {
    es:'No se encontraron traders con ese handle', en:'No traders found with that handle',
    fr:'Aucun trader trouvé avec ce handle', it:'Nessun trader trovato con questo handle',
    de:'Kein Trader mit diesem Handle gefunden', pt:'Nenhum trader encontrado com esse handle',
    zh:'未找到该handle的交易者', ru:'Трейдеры с таким handle не найдены',
    ar:'لم يتم العثور على متداولين بهذا الاسم', ja:'そのhandleのトレーダーは見つかりません', ko:'해당 handle의 트레이더를 찾을 수 없습니다',
  },
  trader_search_error: {
    es:'Error al buscar traders', en:'Error searching traders', fr:'Erreur lors de la recherche',
    it:'Errore nella ricerca', de:'Fehler bei der Suche', pt:'Erro ao buscar traders',
    zh:'搜索交易者时出错', ru:'Ошибка поиска трейдеров', ar:'خطأ في البحث عن المتداولين',
    ja:'トレーダー検索エラー', ko:'트레이더 검색 오류',
  },

  // ── Community write errors ──
  community_write_analysis: {
    es:'Escribe tu análisis.', en:'Write your analysis.', fr:'Rédigez votre analyse.',
    it:'Scrivi la tua analisi.', de:'Schreiben Sie Ihre Analyse.', pt:'Escreva sua análise.',
    zh:'请写下您的分析。', ru:'Напишите свой анализ.', ar:'اكتب تحليلك.', ja:'分析を書いてください。', ko:'분석을 작성하세요.',
  },
  community_add_ticker: {
    es:'Añade al menos un ticker.', en:'Add at least one ticker.', fr:'Ajoutez au moins un ticker.',
    it:'Aggiungi almeno un ticker.', de:'Fügen Sie mindestens einen Ticker hinzu.', pt:'Adicione pelo menos um ticker.',
    zh:'至少添加一个股票代码。', ru:'Добавьте хотя бы один тикер.', ar:'أضف رمزًا واحدًا على الأقل.',
    ja:'少なくとも1つのティッカーを追加してください。', ko:'최소 하나의 티커를 추가하세요.',
  },

  // ── Portfolio UI ──
  portfolio_bank_account: {
    es:'Cuenta Bancaria', en:'Bank Account', fr:'Compte bancaire', it:'Conto bancario',
    de:'Bankkonto', pt:'Conta bancária', zh:'银行账户', ru:'Банковский счёт', ar:'الحساب البنكي', ja:'銀行口座', ko:'은행 계좌',
  },
  portfolio_gains_summary: {
    es:'Resumen de Ganancias', en:'Gains Summary', fr:'Résumé des gains', it:'Riepilogo guadagni',
    de:'Gewinnübersicht', pt:'Resumo de ganhos', zh:'收益摘要', ru:'Сводка прибыли', ar:'ملخص الأرباح', ja:'利益サマリー', ko:'수익 요약',
  },
  portfolio_dividend_gains: {
    es:'Ganancias por Dividendos', en:'Dividend Gains', fr:'Gains de dividendes', it:'Guadagni da dividendi',
    de:'Dividendengewinne', pt:'Ganhos de dividendos', zh:'股息收益', ru:'Дивидендная прибыль', ar:'أرباح الأسهم', ja:'配当利益', ko:'배당 수익',
  },
  portfolio_dividends_accumulated: {
    es:'Dividendos cobrados acumulados', en:'Accumulated dividends received', fr:'Dividendes accumulés', it:'Dividendi accumulati',
    de:'Aufgelaufene Dividenden', pt:'Dividendos acumulados', zh:'累计股息', ru:'Накопленные дивиденды', ar:'الأرباح المتراكمة', ja:'累積配当', ko:'누적 배당금',
  },
  portfolio_stock_value_gain: {
    es:'Ganancia por Valor de Acciones', en:'Stock Value Gain', fr:'Gain sur valeur des actions', it:'Guadagno sul valore delle azioni',
    de:'Kursgewinn', pt:'Ganho por valor das ações', zh:'股票价值收益', ru:'Прирост стоимости акций', ar:'مكاسب قيمة الأسهم', ja:'株価値上がり益', ko:'주식 가치 이익',
  },
  portfolio_current_vs_avg: {
    es:'Precio actual vs. costo promedio', en:'Current price vs. average cost', fr:'Prix actuel vs. coût moyen', it:'Prezzo attuale vs. costo medio',
    de:'Aktueller Preis vs. Durchschnittskosten', pt:'Preço atual vs. custo médio', zh:'当前价格 vs. 平均成本', ru:'Текущая цена vs. средняя стоимость', ar:'السعر الحالي مقابل متوسط التكلفة', ja:'現在価格 vs. 平均コスト', ko:'현재 가격 vs. 평균 비용',
  },
  portfolio_total_gain: {
    es:'Ganancia Total', en:'Total Gain', fr:'Gain total', it:'Guadagno totale',
    de:'Gesamtgewinn', pt:'Ganho total', zh:'总收益', ru:'Общая прибыль', ar:'الربح الإجمالي', ja:'総利益', ko:'총 이익',
  },
  portfolio_dividends_plus_stocks: {
    es:'Dividendos + valor de acciones', en:'Dividends + stock value', fr:'Dividendes + valeur des actions', it:'Dividendi + valore azioni',
    de:'Dividenden + Aktienwert', pt:'Dividendos + valor das ações', zh:'股息 + 股票价值', ru:'Дивиденды + стоимость акций', ar:'الأرباح + قيمة الأسهم', ja:'配当 + 株式価値', ko:'배당 + 주식 가치',
  },
  portfolio_amount_usd: {
    es:'Cantidad en USD', en:'Amount in USD', fr:'Montant en USD', it:'Importo in USD',
    de:'Betrag in USD', pt:'Valor em USD', zh:'金额（美元）', ru:'Сумма в USD', ar:'المبلغ بالدولار', ja:'USD金額', ko:'USD 금액',
  },
  portfolio_deposited: {
    es:'Depositado', en:'Deposited', fr:'Déposé', it:'Depositato',
    de:'Eingezahlt', pt:'Depositado', zh:'已存入', ru:'Внесено', ar:'المودع', ja:'入金済み', ko:'입금',
  },
  portfolio_withdrawn: {
    es:'Retirado', en:'Withdrawn', fr:'Retiré', it:'Prelevato',
    de:'Abgehoben', pt:'Retirado', zh:'已取出', ru:'Выведено', ar:'المسحوب', ja:'出金済み', ko:'출금',
  },
  portfolio_dividends_received: {
    es:'Dividendos recibidos', en:'Dividends received', fr:'Dividendes reçus', it:'Dividendi ricevuti',
    de:'Erhaltene Dividenden', pt:'Dividendos recebidos', zh:'已收股息', ru:'Полученные дивиденды', ar:'الأرباح المستلمة', ja:'受取配当', ko:'수령 배당금',
  },
  portfolio_buy_sell: {
    es:'Comprar / Vender', en:'Buy / Sell', fr:'Acheter / Vendre', it:'Acquistare / Vendere',
    de:'Kaufen / Verkaufen', pt:'Comprar / Vender', zh:'买入 / 卖出', ru:'Купить / Продать', ar:'شراء / بيع', ja:'買い / 売り', ko:'매수 / 매도',
  },
  portfolio_symbol_placeholder: {
    es:'Símbolo (ej. AAPL)', en:'Symbol (e.g. AAPL)', fr:'Symbole (ex. AAPL)', it:'Simbolo (es. AAPL)',
    de:'Symbol (z.B. AAPL)', pt:'Símbolo (ex. AAPL)', zh:'代码（如 AAPL）', ru:'Тикер (напр. AAPL)', ar:'الرمز (مثل AAPL)', ja:'シンボル（例：AAPL）', ko:'심볼 (예: AAPL)',
  },
  portfolio_shares_placeholder: {
    es:'Número de acciones', en:'Number of shares', fr:'Nombre d\'actions', it:'Numero di azioni',
    de:'Anzahl der Aktien', pt:'Número de ações', zh:'股数', ru:'Количество акций', ar:'عدد الأسهم', ja:'株数', ko:'주식 수',
  },
  portfolio_current_price_total: {
    es:'Precio actual', en:'Current price', fr:'Prix actuel', it:'Prezzo attuale',
    de:'Aktueller Preis', pt:'Preço atual', zh:'当前价格', ru:'Текущая цена', ar:'السعر الحالي', ja:'現在価格', ko:'현재 가격',
  },
  portfolio_record_dividend: {
    es:'Registrar Dividendo', en:'Record Dividend', fr:'Enregistrer dividende', it:'Registra dividendo',
    de:'Dividende erfassen', pt:'Registrar dividendo', zh:'记录股息', ru:'Записать дивиденд', ar:'تسجيل الأرباح', ja:'配当を記録', ko:'배당 기록',
  },
  portfolio_dividend_hint: {
    es:'Ingresa el dividendo por acción y se calculará automáticamente según tus acciones.', en:'Enter the dividend per share and it will be calculated automatically based on your shares.',
    fr:'Entrez le dividende par action.', it:'Inserisci il dividendo per azione.', de:'Dividende pro Aktie eingeben.', pt:'Insira o dividendo por ação.',
    zh:'输入每股股息，将根据您的股份自动计算。', ru:'Введите дивиденд на акцию.', ar:'أدخل الأرباح لكل سهم.', ja:'1株あたりの配当を入力してください。', ko:'주당 배당금을 입력하세요.',
  },
  portfolio_dividend_per_share: {
    es:'Dividendo por acción (USD)', en:'Dividend per share (USD)', fr:'Dividende par action (USD)', it:'Dividendo per azione (USD)',
    de:'Dividende pro Aktie (USD)', pt:'Dividendo por ação (USD)', zh:'每股股息（美元）', ru:'Дивиденд на акцию (USD)', ar:'الأرباح لكل سهم (USD)', ja:'1株あたり配当（USD）', ko:'주당 배당금 (USD)',
  },
  portfolio_positions: {
    es:'Posiciones', en:'Positions', fr:'Positions', it:'Posizioni',
    de:'Positionen', pt:'Posições', zh:'持仓', ru:'Позиции', ar:'المراكز', ja:'ポジション', ko:'포지션',
  },
  portfolio_compare_vs: {
    es:'Comparar vs:', en:'Compare vs:', fr:'Comparer vs :', it:'Confronta vs:',
    de:'Vergleichen mit:', pt:'Comparar vs:', zh:'对比：', ru:'Сравнить с:', ar:'مقارنة مع:', ja:'比較：', ko:'비교:',
  },
  portfolio_update_prices: {
    es:'Actualizar precios', en:'Update prices', fr:'Actualiser les prix', it:'Aggiorna prezzi',
    de:'Preise aktualisieren', pt:'Atualizar preços', zh:'更新价格', ru:'Обновить цены', ar:'تحديث الأسعار', ja:'価格を更新', ko:'가격 업데이트',
  },
  portfolio_price_alerts: {
    es:'Alertas de precio', en:'Price Alerts', fr:'Alertes de prix', it:'Avvisi di prezzo',
    de:'Preisalarme', pt:'Alertas de preço', zh:'价格提醒', ru:'Ценовые оповещения', ar:'تنبيهات الأسعار', ja:'価格アラート', ko:'가격 알림',
  },
  portfolio_alert_rises_above: {
    es:'Sube de', en:'Rises above', fr:'Monte au-dessus de', it:'Sale sopra',
    de:'Steigt über', pt:'Sobe acima de', zh:'上涨超过', ru:'Поднимается выше', ar:'يرتفع فوق', ja:'上昇して超える', ko:'상승하여 초과',
  },
  portfolio_alert_falls_below: {
    es:'Baja de', en:'Falls below', fr:'Descend en dessous de', it:'Scende sotto',
    de:'Fällt unter', pt:'Cai abaixo de', zh:'下跌低于', ru:'Падает ниже', ar:'ينخفض دون', ja:'下落して下回る', ko:'하락하여 미만',
  },
  portfolio_alert_add: {
    es:'+ Agregar', en:'+ Add', fr:'+ Ajouter', it:'+ Aggiungi',
    de:'+ Hinzufügen', pt:'+ Adicionar', zh:'+ 添加', ru:'+ Добавить', ar:'+ إضافة', ja:'+ 追加', ko:'+ 추가',
  },
  portfolio_alert_active: {
    es:'ACTIVA', en:'ACTIVE', fr:'ACTIVE', it:'ATTIVA',
    de:'AKTIV', pt:'ATIVA', zh:'激活', ru:'АКТИВНА', ar:'نشط', ja:'アクティブ', ko:'활성',
  },
  portfolio_no_alerts: {
    es:'No hay alertas configuradas.', en:'No alerts configured.', fr:'Aucune alerte configurée.', it:'Nessun avviso configurato.',
    de:'Keine Alarme konfiguriert.', pt:'Nenhum alerta configurado.', zh:'未配置提醒。', ru:'Нет настроенных оповещений.', ar:'لا توجد تنبيهات مضبوطة.', ja:'アラートが設定されていません。', ko:'설정된 알림이 없습니다.',
  },
  portfolio_chart_title: {
    es:'Gráfica del Portafolio', en:'Portfolio Chart', fr:'Graphique du portefeuille', it:'Grafico del portafoglio',
    de:'Portfolio-Diagramm', pt:'Gráfico do portfólio', zh:'投资组合图表', ru:'График портфеля', ar:'مخطط المحفظة', ja:'ポートフォリオチャート', ko:'포트폴리오 차트',
  },
  portfolio_total_value_chart: {
    es:'Valor Total del Portafolio', en:'Total Portfolio Value', fr:'Valeur totale du portefeuille', it:'Valore totale del portafoglio',
    de:'Gesamtportefeuillewert', pt:'Valor total do portfólio', zh:'投资组合总价值', ru:'Общая стоимость портфеля', ar:'إجمالي قيمة المحفظة', ja:'ポートフォリオ総価値', ko:'포트폴리오 총 가치',
  },
  portfolio_with_cash: {
    es:'Con efectivo', en:'With cash', fr:'Avec liquidités', it:'Con contanti',
    de:'Mit Bargeld', pt:'Com dinheiro', zh:'含现金', ru:'С наличными', ar:'مع النقد', ja:'現金含む', ko:'현금 포함',
  },
  portfolio_without_cash: {
    es:'Sin efectivo', en:'Without cash', fr:'Sans liquidités', it:'Senza contanti',
    de:'Ohne Bargeld', pt:'Sem dinheiro', zh:'不含现金', ru:'Без наличных', ar:'بدون نقد', ja:'現金除く', ko:'현금 제외',
  },
  portfolio_current_value: {
    es:'Valor Actual', en:'Current Value', fr:'Valeur actuelle', it:'Valore attuale',
    de:'Aktueller Wert', pt:'Valor atual', zh:'当前价值', ru:'Текущая стоимость', ar:'القيمة الحالية', ja:'現在価値', ko:'현재 가치',
  },
  portfolio_transaction_history: {
    es:'Historial de Transacciones', en:'Transaction History', fr:'Historique des transactions', it:'Storico transazioni',
    de:'Transaktionsverlauf', pt:'Histórico de transações', zh:'交易历史', ru:'История транзакций', ar:'سجل المعاملات', ja:'取引履歴', ko:'거래 내역',
  },
  portfolio_news: {
    es:'Noticias', en:'News', fr:'Actualités', it:'Notizie',
    de:'Nachrichten', pt:'Notícias', zh:'新闻', ru:'Новости', ar:'الأخبار', ja:'ニュース', ko:'뉴스',
  },
  portfolio_news_search: {
    es:'Buscar', en:'Search', fr:'Rechercher', it:'Cerca',
    de:'Suchen', pt:'Buscar', zh:'搜索', ru:'Поиск', ar:'بحث', ja:'検索', ko:'검색',
  },
  portfolio_news_not_found: {
    es:'No se encontraron noticias para este símbolo.', en:'No news found for this symbol.', fr:'Aucune actualité trouvée.', it:'Nessuna notizia trovata.',
    de:'Keine Nachrichten gefunden.', pt:'Nenhuma notícia encontrada.', zh:'未找到该股票的新闻。', ru:'Новости не найдены.', ar:'لم يتم العثور على أخبار.', ja:'このシンボルのニュースが見つかりません。', ko:'이 심볼에 대한 뉴스를 찾을 수 없습니다.',
  },
  portfolio_news_error: {
    es:'Error al cargar noticias.', en:'Error loading news.', fr:'Erreur lors du chargement.', it:'Errore nel caricamento.',
    de:'Fehler beim Laden.', pt:'Erro ao carregar notícias.', zh:'加载新闻时出错。', ru:'Ошибка загрузки новостей.', ar:'خطأ في تحميل الأخبار.', ja:'ニュースの読み込みエラー。', ko:'뉴스 로딩 오류.',
  },
  portfolio_no_news_in_period: {
    es:'No hay noticias en este período.', en:'No news in this period.', fr:'Aucune actualité dans cette période.', it:'Nessuna notizia in questo periodo.',
    de:'Keine Nachrichten in diesem Zeitraum.', pt:'Sem notícias neste período.', zh:'此期间没有新闻。', ru:'Нет новостей за этот период.', ar:'لا أخبار في هذه الفترة.', ja:'この期間のニュースはありません。', ko:'이 기간에 뉴스가 없습니다.',
  },
  portfolio_enter_symbol_news: {
    es:'Ingresa un símbolo para ver noticias.', en:'Enter a symbol to see news.', fr:'Entrez un symbole pour voir les actualités.', it:'Inserisci un simbolo per vedere le notizie.',
    de:'Symbol eingeben, um Nachrichten zu sehen.', pt:'Insira um símbolo para ver notícias.', zh:'输入代码以查看新闻。', ru:'Введите тикер для просмотра новостей.', ar:'أدخل رمزًا لرؤية الأخبار.', ja:'ニュースを見るにはシンボルを入力してください。', ko:'뉴스를 보려면 심볼을 입력하세요.',
  },
  portfolio_charts_hint: {
    es:'Hay dos gráficas disponibles en esta sección:', en:'Two charts are available in this section:',
    fr:'Deux graphiques disponibles :', it:'Due grafici disponibili :', de:'Zwei Diagramme verfügbar:', pt:'Dois gráficos disponíveis:', zh:'本节有两个图表：', ru:'В этом разделе доступны два графика:', ar:'يتوفر مخططان في هذا القسم:', ja:'このセクションには2つのチャートがあります：', ko:'이 섹션에는 두 개의 차트가 있습니다:',
  },
  portfolio_chart_hint_portfolio: {
    es:'Gráfica del Portafolio', en:'Portfolio Chart', fr:'Graphique du portefeuille', it:'Grafico del portafoglio',
    de:'Portfolio-Diagramm', pt:'Gráfico do portfólio', zh:'投资组合图表', ru:'График портфеля', ar:'مخطط المحفظة', ja:'ポートフォリオチャート', ko:'포트폴리오 차트',
  },
  portfolio_chart_hint_portfolio_desc: {
    es:'aparece cuando tienes al menos una acción comprada.', en:'appears when you have at least one stock purchased.',
    fr:'apparaît quand vous avez au moins une action.', it:'appare quando hai almeno un\'azione acquistata.', de:'erscheint wenn Sie mindestens eine Aktie haben.', pt:'aparece quando você tem pelo menos uma ação comprada.',
    zh:'当您至少购买了一只股票时出现。', ru:'появляется когда у вас есть хотя бы одна акция.', ar:'يظهر عندما يكون لديك سهم واحد على الأقل.', ja:'少なくとも1株購入している場合に表示されます。', ko:'최소 한 주를 구매했을 때 나타납니다.',
  },
  portfolio_chart_hint_total: {
    es:'Valor Total del Portafolio', en:'Total Portfolio Value', fr:'Valeur totale du portefeuille', it:'Valore totale del portafoglio',
    de:'Gesamtportefeuillewert', pt:'Valor total do portfólio', zh:'投资组合总价值', ru:'Общая стоимость портфеля', ar:'إجمالي قيمة المحفظة', ja:'ポートフォリオ総価値', ko:'포트폴리오 총 가치',
  },
  portfolio_chart_hint_total_desc: {
    es:'aparece cuando tienes al menos una transacción registrada (depósito, compra, venta o dividendo).', en:'appears when you have at least one recorded transaction (deposit, buy, sell, or dividend).',
    fr:'apparaît quand vous avez au moins une transaction.', it:'appare quando hai almeno una transazione registrata.', de:'erscheint wenn Sie mindestens eine Transaktion haben.', pt:'aparece quando você tem pelo menos uma transação registrada.',
    zh:'当您至少有一笔记录的交易时出现。', ru:'появляется когда у вас есть хотя бы одна транзакция.', ar:'يظهر عندما يكون لديك معاملة مسجلة واحدة على الأقل.', ja:'少なくとも1つの取引が記録されている場合に表示されます。', ko:'최소 하나의 거래가 기록되었을 때 나타납니다.',
  },
  portfolio_average: {
    es:'Promedio', en:'Average', fr:'Moyenne', it:'Media',
    de:'Durchschnitt', pt:'Média', zh:'平均', ru:'Среднее', ar:'المتوسط', ja:'平均', ko:'평균',
  },
  portfolio_insufficient_funds: {
    es:'Fondos insuficientes. Necesitas', en:'Insufficient funds. You need', fr:'Fonds insuffisants. Vous avez besoin de', it:'Fondi insufficienti. Hai bisogno di',
    de:'Unzureichende Mittel. Sie benötigen', pt:'Fundos insuficientes. Você precisa de', zh:'资金不足。您需要', ru:'Недостаточно средств. Вам нужно', ar:'أموال غير كافية. تحتاج إلى', ja:'資金不足。必要額：', ko:'자금 부족. 필요 금액:',
  },
  portfolio_not_enough_shares: {
    es:'No tienes suficientes acciones de', en:'Not enough shares of', fr:'Pas assez d\'actions de', it:'Non hai abbastanza azioni di',
    de:'Nicht genug Aktien von', pt:'Não tem ações suficientes de', zh:'没有足够的股票', ru:'Недостаточно акций', ar:'ليس لديك ما يكفي من أسهم', ja:'株数が不足しています', ko:'주식이 부족합니다',
  },
  portfolio_update_prices_first: {
    es:'Actualiza los precios primero', en:'Update prices first', fr:'Mettez d\'abord les prix à jour', it:'Aggiorna prima i prezzi',
    de:'Preise zuerst aktualisieren', pt:'Atualize os preços primeiro', zh:'请先更新价格', ru:'Сначала обновите цены', ar:'قم بتحديث الأسعار أولاً', ja:'まず価格を更新してください', ko:'먼저 가격을 업데이트하세요',
  },
  portfolio_symbol_required: {
    es:'Símbolo y cantidad requeridos', en:'Symbol and quantity required', fr:'Symbole et quantité requis', it:'Simbolo e quantità richiesti',
    de:'Symbol und Menge erforderlich', pt:'Símbolo e quantidade necessários', zh:'需要代码和数量', ru:'Требуется тикер и количество', ar:'الرمز والكمية مطلوبان', ja:'シンボルと数量が必要です', ko:'심볼과 수량이 필요합니다',
  },
  portfolio_could_not_get_price: {
    es:'No se pudo obtener el precio', en:'Could not get the price', fr:'Impossible d\'obtenir le prix', it:'Impossibile ottenere il prezzo',
    de:'Preis konnte nicht abgerufen werden', pt:'Não foi possível obter o preço', zh:'无法获取价格', ru:'Не удалось получить цену', ar:'تعذر الحصول على السعر', ja:'価格を取得できませんでした', ko:'가격을 가져올 수 없습니다',
  },
  portfolio_total: {
    es:'Total', en:'Total', fr:'Total', it:'Totale',
    de:'Gesamt', pt:'Total', zh:'总计', ru:'Итого', ar:'الإجمالي', ja:'合計', ko:'합계',
  },
  portfolio_shares_count: {
    es:'acciones', en:'shares', fr:'actions', it:'azioni',
    de:'Aktien', pt:'ações', zh:'股', ru:'акций', ar:'أسهم', ja:'株', ko:'주',
  },
  portfolio_update: {
    es:'Actualizar', en:'Update', fr:'Actualiser', it:'Aggiorna',
    de:'Aktualisieren', pt:'Atualizar', zh:'更新', ru:'Обновить', ar:'تحديث', ja:'更新', ko:'업데이트',
  },
  portfolio_loading_news: {
    es:'Cargando noticias...', en:'Loading news...', fr:'Chargement des actualités...', it:'Caricamento notizie...',
    de:'Nachrichten laden...', pt:'Carregando notícias...', zh:'加载新闻中...', ru:'Загрузка новостей...', ar:'جارٍ تحميل الأخبار...', ja:'ニュース読み込み中...', ko:'뉴스 로딩 중...',
  },

  // ── Performance tab ──
  portfolio_performance_tab: {
    es:'Rendimiento', en:'Performance', fr:'Performance', it:'Performance',
    de:'Performance', pt:'Desempenho', zh:'表现', ru:'Производительность', ar:'الأداء', ja:'パフォーマンス', ko:'성과',
  },

  // ── Table headers ──
  label_symbol: {
    es:'Símbolo', en:'Symbol', fr:'Symbole', it:'Simbolo',
    de:'Symbol', pt:'Símbolo', zh:'代码', ru:'Тикер', ar:'الرمز', ja:'シンボル', ko:'심볼',
  },
  label_avg_cost: {
    es:'Comprado a', en:'Avg. Cost', fr:'Coût moyen', it:'Costo medio',
    de:'Ø Kosten', pt:'Custo médio', zh:'平均成本', ru:'Ср. цена', ar:'متوسط التكلفة', ja:'平均コスト', ko:'평균 비용',
  },
  label_price_period_ago: {
    es:'Precio hace', en:'Price', fr:'Prix il y a', it:'Prezzo',
    de:'Preis vor', pt:'Preço há', zh:'价格', ru:'Цена', ar:'السعر قبل', ja:'価格', ko:'가격',
  },
  label_gp_vs_buy: {
    es:'G/P vs compra', en:'G/L vs buy', fr:'G/P vs achat', it:'G/P vs acquisto',
    de:'G/V vs Kauf', pt:'G/P vs compra', zh:'盈亏 vs 买入', ru:'П/У vs покупка', ar:'ر/خ مقابل الشراء', ja:'損益 vs 購入', ko:'손익 vs 매수',
  },
  label_gp_period: {
    es:'G/P en período', en:'G/L in period', fr:'G/P sur période', it:'G/P nel periodo',
    de:'G/V im Zeitraum', pt:'G/P no período', zh:'期间盈亏', ru:'П/У за период', ar:'ر/خ في الفترة', ja:'期間損益', ko:'기간 손익',
  },

  // ── Comparator sections ──
  label_technical_indicators: {
    es:'Indicadores Técnicos', en:'Technical Indicators', fr:'Indicateurs techniques', it:'Indicatori tecnici',
    de:'Technische Indikatoren', pt:'Indicadores técnicos', zh:'技术指标', ru:'Технические индикаторы', ar:'المؤشرات الفنية', ja:'テクニカル指標', ko:'기술 지표',
  },
  label_select_stock_indicators: {
    es:'Selecciona una acción para ver sus indicadores técnicos.', en:'Select a stock to view its technical indicators.',
    fr:'Sélectionnez une action pour voir ses indicateurs.', it:'Seleziona un\'azione per vedere i suoi indicatori.',
    de:'Wählen Sie eine Aktie aus, um ihre Indikatoren zu sehen.', pt:'Selecione uma ação para ver seus indicadores.',
    zh:'选择一只股票查看其技术指标。', ru:'Выберите акцию для просмотра индикаторов.', ar:'اختر سهمًا لرؤية مؤشراته الفنية.', ja:'テクニカル指標を見るには株を選択してください。', ko:'기술 지표를 보려면 주식을 선택하세요.',
  },
  label_pattern_recognition: {
    es:'Reconocimiento de Patrones', en:'Pattern Recognition', fr:'Reconnaissance de motifs', it:'Riconoscimento di pattern',
    de:'Mustererkennung', pt:'Reconhecimento de padrões', zh:'形态识别', ru:'Распознавание паттернов', ar:'التعرف على الأنماط', ja:'パターン認識', ko:'패턴 인식',
  },
  label_select_stock_patterns: {
    es:'Selecciona una acción para detectar patrones gráficos.', en:'Select a stock to detect chart patterns.',
    fr:'Sélectionnez une action pour détecter des motifs.', it:'Seleziona un\'azione per rilevare pattern.',
    de:'Wählen Sie eine Aktie aus, um Muster zu erkennen.', pt:'Selecione uma ação para detectar padrões.',
    zh:'选择一只股票以检测图表形态。', ru:'Выберите акцию для обнаружения паттернов.', ar:'اختر سهمًا للكشف عن الأنماط البيانية.', ja:'チャートパターンを検出するには株を選択してください。', ko:'차트 패턴을 감지하려면 주식을 선택하세요.',
  },
  label_no_patterns_detected: {
    es:'No se detectaron patrones reconocibles en el período actual. Prueba con un rango de tiempo más largo.', en:'No recognizable patterns detected in the current period. Try a longer time range.',
    fr:'Aucun motif reconnaissable détecté. Essayez une plage de temps plus longue.', it:'Nessun pattern riconoscibile rilevato. Prova un intervallo di tempo più lungo.',
    de:'Keine erkennbaren Muster im aktuellen Zeitraum. Versuchen Sie einen längeren Zeitraum.', pt:'Nenhum padrão reconhecível detectado. Tente um intervalo de tempo mais longo.',
    zh:'当前时期未检测到可识别的形态。请尝试更长的时间范围。', ru:'В текущем периоде не обнаружено распознаваемых паттернов. Попробуйте более длинный диапазон.', ar:'لم يتم اكتشاف أنماط قابلة للتعرف في الفترة الحالية.', ja:'現在の期間に認識可能なパターンは検出されませんでした。', ko:'현재 기간에 인식 가능한 패턴이 감지되지 않았습니다.',
  },
  label_patterns_disclaimer: {
    es:'Los patrones son indicativos, no garantizan movimientos futuros.', en:'Patterns are indicative and do not guarantee future movements.',
    fr:'Les motifs sont indicatifs et ne garantissent pas les mouvements futurs.', it:'I pattern sono indicativi e non garantiscono movimenti futuri.',
    de:'Muster sind indikativ und garantieren keine zukünftigen Bewegungen.', pt:'Os padrões são indicativos e não garantem movimentos futuros.',
    zh:'形态仅供参考，不保证未来走势。', ru:'Паттерны носят ориентировочный характер и не гарантируют будущих движений.', ar:'الأنماط استرشادية ولا تضمن الحركات المستقبلية.', ja:'パターンは参考であり、将来の動きを保証するものではありません。', ko:'패턴은 참고용이며 미래 움직임을 보장하지 않습니다.',
  },
  label_backtesting: {
    es:'Backtesting de Estrategias', en:'Strategy Backtesting', fr:'Backtesting de stratégies', it:'Backtesting di strategie',
    de:'Strategie-Backtesting', pt:'Backtesting de estratégias', zh:'策略回测', ru:'Бэктестинг стратегий', ar:'اختبار الاستراتيجيات', ja:'戦略バックテスト', ko:'전략 백테스팅',
  },
  label_strategy: {
    es:'Estrategia', en:'Strategy', fr:'Stratégie', it:'Strategia',
    de:'Strategie', pt:'Estratégia', zh:'策略', ru:'Стратегия', ar:'الاستراتيجية', ja:'戦略', ko:'전략',
  },
  label_select_stock_backtest: {
    es:'Selecciona una acción y una estrategia para ejecutar el backtest.', en:'Select a stock and a strategy to run the backtest.',
    fr:'Sélectionnez une action et une stratégie pour exécuter le backtest.', it:'Seleziona un\'azione e una strategia per eseguire il backtest.',
    de:'Wählen Sie eine Aktie und eine Strategie für den Backtest.', pt:'Selecione uma ação e uma estratégia para executar o backtest.',
    zh:'选择一只股票和一个策略来运行回测。', ru:'Выберите акцию и стратегию для запуска бэктеста.', ar:'اختر سهمًا واستراتيجية لتشغيل الاختبار.', ja:'バックテストを実行するには株と戦略を選択してください。', ko:'백테스트를 실행하려면 주식과 전략을 선택하세요.',
  },
  label_comparative_analysis: {
    es:'Análisis Comparativo', en:'Comparative Analysis', fr:'Analyse comparative', it:'Analisi comparativa',
    de:'Vergleichsanalyse', pt:'Análise comparativa', zh:'比较分析', ru:'Сравнительный анализ', ar:'التحليل المقارن', ja:'比較分析', ko:'비교 분석',
  },
  label_volatility: {
    es:'Volatilidad', en:'Volatility', fr:'Volatilité', it:'Volatilità',
    de:'Volatilität', pt:'Volatilidade', zh:'波动率', ru:'Волатильность', ar:'التقلب', ja:'ボラティリティ', ko:'변동성',
  },
  label_range_pct: {
    es:'Rango %', en:'Range %', fr:'Plage %', it:'Intervallo %',
    de:'Bereich %', pt:'Faixa %', zh:'区间 %', ru:'Диапазон %', ar:'النطاق %', ja:'レンジ %', ko:'범위 %',
  },
  label_vs_average: {
    es:'vs Promedio', en:'vs Average', fr:'vs Moyenne', it:'vs Media',
    de:'vs Durchschnitt', pt:'vs Média', zh:'vs 均值', ru:'vs Среднее', ar:'مقابل المتوسط', ja:'vs 平均', ko:'vs 평균',
  },
  label_rsi_signal: {
    es:'Señal RSI', en:'RSI Signal', fr:'Signal RSI', it:'Segnale RSI',
    de:'RSI-Signal', pt:'Sinal RSI', zh:'RSI信号', ru:'Сигнал RSI', ar:'إشارة RSI', ja:'RSIシグナル', ko:'RSI 신호',
  },

  label_overbought: {
    es:'Sobrecomprado', en:'Overbought', fr:'Suracheté', it:'Ipercomprato',
    de:'Überkauft', pt:'Sobrecomprado', zh:'超买', ru:'Перекуплен', ar:'ذروة الشراء', ja:'買われすぎ', ko:'과매수',
  },
  label_oversold: {
    es:'Sobrevendido', en:'Oversold', fr:'Survendu', it:'Ipervenduto',
    de:'Überverkauft', pt:'Sobrevendido', zh:'超卖', ru:'Перепродан', ar:'ذروة البيع', ja:'売られすぎ', ko:'과매도',
  },
  label_neutral: {
    es:'Neutral', en:'Neutral', fr:'Neutre', it:'Neutrale',
    de:'Neutral', pt:'Neutro', zh:'中性', ru:'Нейтральный', ar:'محايد', ja:'ニュートラル', ko:'중립',
  },
  label_initial_capital: {
    es:'Capital inicial', en:'Initial capital', fr:'Capital initial', it:'Capitale iniziale',
    de:'Anfangskapital', pt:'Capital inicial', zh:'初始资金', ru:'Начальный капитал', ar:'رأس المال الأولي', ja:'初期資本', ko:'초기 자본',
  },
  label_final_capital: {
    es:'Capital final', en:'Final capital', fr:'Capital final', it:'Capitale finale',
    de:'Endkapital', pt:'Capital final', zh:'最终资金', ru:'Конечный капитал', ar:'رأس المال النهائي', ja:'最終資本', ko:'최종 자본',
  },
  label_trades: {
    es:'Operaciones', en:'Trades', fr:'Opérations', it:'Operazioni',
    de:'Trades', pt:'Operações', zh:'交易次数', ru:'Сделки', ar:'الصفقات', ja:'取引数', ko:'거래 수',
  },
  label_avg_pnl: {
    es:'PnL promedio', en:'Avg PnL', fr:'PnL moyen', it:'PnL medio',
    de:'Ø PnL', pt:'PnL médio', zh:'平均盈亏', ru:'Средний PnL', ar:'متوسط الربح والخسارة', ja:'平均PnL', ko:'평균 PnL',
  },
  label_rsi_legend: {
    es:'SC = Sobrecomprado · SV = Sobrevendido · N = Neutral · Volatilidad = desviación estándar / precio medio',
    en:'OB = Overbought · OS = Oversold · N = Neutral · Volatility = std dev / mean price',
    fr:'SC = Suracheté · SV = Survendu · N = Neutre', it:'SC = Ipercomprato · SV = Ipervenduto · N = Neutrale',
    de:'ÜK = Überkauft · ÜV = Überverkauft · N = Neutral', pt:'SC = Sobrecomprado · SV = Sobrevendido · N = Neutro',
    zh:'OB = 超买 · OS = 超卖 · N = 中性', ru:'ПК = Перекуплен · ПП = Перепродан · Н = Нейтральный',
    ar:'SC = ذروة الشراء · SV = ذروة البيع · N = محايد', ja:'OB = 買われすぎ · OS = 売られすぎ · N = ニュートラル', ko:'OB = 과매수 · OS = 과매도 · N = 중립',
  },
  label_press_update_news: {
    es:'Presiona "Actualizar" para cargar noticias de las acciones seleccionadas.',
    en:'Press "Update" to load news for the selected stocks.',
    fr:'Appuyez sur "Actualiser" pour charger les actualités.', it:'Premi "Aggiorna" per caricare le notizie.',
    de:'Drücken Sie "Aktualisieren", um Nachrichten zu laden.', pt:'Pressione "Atualizar" para carregar notícias.',
    zh:'按"更新"加载所选股票的新闻。', ru:'Нажмите "Обновить" для загрузки новостей.', ar:'اضغط "تحديث" لتحميل الأخبار.', ja:'「更新」を押して選択した株のニュースを読み込みます。', ko:'"업데이트"를 눌러 선택한 주식의 뉴스를 로드하세요.',
  },
};

export function t(key, lang) {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang] ?? entry['es'] ?? key;
}
