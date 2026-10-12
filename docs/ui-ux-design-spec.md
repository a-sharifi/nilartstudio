# سند جامع UI/UX نیل‌آرت — نسخه ۲

**مرجع:** [PRD نسخه ۲](./rfp.md)  
**نسخه:** ۲.۰  
**تاریخ:** ۲۰۲۶-۱۰-۱۱  
**وضعیت:** مرجع جاری طراحی؛ جایگزین کامل سند UI/UX نسخه ۱

این سند برای طراحی صفحه‌به‌صفحه با AI و تحویل به تیم توسعه نوشته شده است. مسیرها پیشنهادی‌اند و قرارداد API نیستند. هر صفحه شناسه مستقل، نقش، هدف، چیدمان، داده، متن دو‌زبانه، تعامل، اعتبارسنجی، حالت‌ها، responsive، دسترس‌پذیری و معیار پذیرش دارد. پرامپت انتهای هر صفحه تمام اطلاعات همان صفحه را تکرار می‌کند تا به‌تنهایی قابل کپی باشد.

## راهنمای استفاده

ترتیب ارسال پرامپت‌ها و صفحات ارسال‌شده در گفتگو در [چک‌لیست پرامپت‌های طراحی](./design-prompt-checklist.md) ثبت می‌شود. شناسه‌های این سند ثابت‌اند؛ ارسال پرامپت به معنی تکمیل یا تأیید طراحی نیست.

۱. با Design System شروع کنید و کامپوننت‌ها را بسازید.  
۲. یک صفحه را با پرامپت کامل همان صفحه به AI بدهید.  
۳. چهار فریم فارسی RTL/انگلیسی LTR در دسکتاپ/موبایل و حالت‌های آن صفحه را تحویل بگیرید.  
۴. طراحی را با معیار پذیرش همان صفحه و قواعد مشترک تطبیق دهید.  
۵. صفحه بعد را با همان توکن‌ها و کامپوننت‌ها طراحی کنید.

تمام مبالغ، نام اشخاص، موجودی و تصاویر نمونه در طراحی نمایشی‌اند. قیمت واقعی، حاشیه هدف و شرایط مرجوعی باید از تنظیمات تأییدشده کسب‌وکار بیایند. مسیر اصلی کالای آماده، به موکاپ یا تولید بعد از خرید وابسته نیست.

## ۱. اصول طراحی و Design System

### ۱.۱ هویت و سلسله‌مراتب

سبک گالری هنری مینیمال و گرم: آثار و کالکشن‌ها در مرکز، زمینه کرم، سطوح سفید، تأکید سفالی، متن تیره و فضای خالی. صفحه فروشگاه تصویری و ساده؛ پنل عملیاتی متراکم‌تر و خوانا؛ حسابداری دقیق با ستون‌های عددی هم‌تراز.

| نقش توکن | مقدار پیشنهادی |
|---|---|
| canvas / surface | `#F8F5EF` / `#FFFFFF` |
| ink / muted | `#211E1A` / `#706B63` |
| border | `#E5DED3` |
| accent / hover | `#A44A32` / `#773322` |
| success / danger | `#28745B` / `#B33B35` |
| warning | زمینه `#FFF2D7`، متن `#744700` |
| فاصله | ۴، ۸، ۱۲، ۱۶، ۲۴، ۳۲، ۴۸، ۶۴px |
| radius | ۸px ورودی، ۱۴px کارت، ۲۴px سطح برجسته |
| اندازه هدف لمس | حداقل ۴۴×۴۴px |

فونت پیشنهادی فارسی Vazirmatn و لاتین Inter با fallback sans-serif. body فارسی ۱۶/۲۸، انگلیسی ۱۶/۲۴؛ caption حداقل ۱۲/۲۰؛ عنوان صفحه ۳۲/۴۰ دسکتاپ و ۲۴/۳۲ موبایل؛ hero ۴۸/۶۰ و ۳۲/۴۴. اعداد مالی tabular باشند. نسبت کنتراست متن عادی حداقل ۴.۵:۱؛ رنگ‌های توکن در حالت واقعی بررسی شوند.

### ۱.۲ Grid و پوسته‌ها

- موبایل: کمتر از ۷۶۸px، حاشیه ۱۶px، grid دو ستون کالا یا یک ستون فرم.
- تبلت: ۷۶۸ تا ۱۱۹۹px، حاشیه ۲۴px، grid سه ستون.
- دسکتاپ: از ۱۲۰۰px، محتوا max-width ۱۲۸۰px، grid چهار ستون؛ پنل sidebar ۲۴۸px.
- فریم تحویل پایه: ۱۴۴۰px و ۳۹۰px؛ آزمون اضافی در ۳۲۰px و ۷۶۸px.
- پوسته عمومی: header لوگو، کالکشن‌ها، فروشگاه، نقاشی، سفارش نقاشی، جست‌وجو، زبان، حساب و سبد؛ footer راهنما و قوانین.
- پوسته مشتری: sidebar داشبورد/سفارش/دانلود/علاقه‌مندی/آدرس/پشتیبانی/تنظیمات؛ header اعلان و زبان.
- پوسته هنرمند: داشبورد/سفارش/سوابق/پروفایل؛ بدون حسابداری فروشگاه.
- پوسته ادمین: داشبورد، کاتالوگ، سفارش، انبار/تولید، هزینه/قیمت، مالی، گزارش، محتوا، کاربران و تنظیمات. زیرمنوها فقط با مجوز نمایان شوند.
- موبایل پنل: drawer ناوبری؛ جدول به کارت label/value یا scroll نام‌گذاری‌شده تبدیل شود. عملیات مهم داخل منوی بی‌نام پنهان نشوند.
- CTA چسبان پایین فقط در خرید/فرم مرحله‌ای؛ safe-area، فضای صفحه و keyboard را رعایت کند.

### ۱.۳ کامپوننت‌ها

دکمه primary/secondary/ghost/danger با default/hover/focus/disabled/loading؛ input با label دائمی و helper/error؛ radio card، checkbox، combobox، textarea، quantity stepper، uploader، tab، breadcrumb، pagination، filter chips، toast، alert، skeleton، stepper، modal و bottom sheet.

کامپوننت‌های دامنه:
- کارت کالکشن: تصویر، نام، توضیح، لینک؛ بدون قیمت گمراه‌کننده.
- کارت محصول: تصویر، عنوان، گرماژ/مشخصه مهم، قیمت «از»، ناموجود و علاقه‌مندی.
- selector گزینه: سایز، تعداد برگ، جلد؛ ناسازگار و ناموجود دو حالت متفاوت‌اند.
- کارت پکیج: اجزا، تخفیف، قیمت نهایی، ظرفیت ترکیب.
- کارت سفارش: شماره، مبلغ، وضعیت کلی و وضعیت اقلام.
- جدول مالی: مبلغ با واحد، تاریخ، مرجع، وضعیت و جمع صفحه/کل با label متفاوت.
- ردیف BOM: نوع جزء، واحد، مقدار، مبنای نرخ، منبع و هزینه؛ مقدار خالی از صفر متمایز.
- مقایسه قیمت: قبل/بعد، اثر روی سود، برچسب «پیشنهادی» و «منتشرشده».
- وضعیت موجودی: کل، رزرو، قابل فروش؛ در فروشگاه فقط اطلاعات قابل فهم مشتری.

### ۱.۴ زبان، تصویر و دسترس‌پذیری

در فارسی جهت راست‌به‌چپ و در انگلیسی چپ‌به‌راست است. breadcrumb، sidebar و فلش جهت‌دار آینه شوند؛ تصویر، لوگو، قلب و اعداد rotate نشوند. SKU، تلفن، رمز، OTP، کد رهگیری و فرمول در محدوده LTR نمایش یابند؛ زبان انگلیسی به معنی تغییر ارز فروش نیست. تومان/ریال همیشه صریح و تبدیل درگاه پنهان از محاسبات نمایشی مشتری باشد.

کارت تصویر crop کنترل‌شده دارد؛ detail با contain نسبت واقعی را حفظ می‌کند. فایل چاپ خصوصی هرگز لینک عمومی نیست. loading با skeleton هم‌شکل؛ error با retry و حفظ ورودی. انیمیشن با reduced-motion سازگار باشد.

تمام کنترل‌ها label، ترتیب tab، focus واضح، خطای مرتبط و target لمس کافی دارند. وضعیت با متن و icon بیان شود؛ فقط رنگ کافی نیست. جدول caption و نمودار جایگزین متنی داشته باشد. modal focus trap و بازگردانی focus، Escape و لغو روشن دارد؛ bottom sheet موبایل همان رفتار معنایی را حفظ کند.

## ۲. قواعد محصول که طراحی باید حفظ کند

| موضوع | قاعده قابل مشاهده |
|---|---|
| کالکشن و دسته | کالکشن گربه با فیلتر دفتر؛ محصول مشترک، بدون تکرار موجودی |
| گزینه و تعداد | سایز/برگ/جلد ترکیب SKU؛ تعداد دفتر کنترل مستقل |
| کالای آماده | ناموجود قابل خرید نیست؛ پیش‌فروش یا «بعداً تولید می‌کنیم» وجود ندارد |
| پکیج | اجزای اجباری و تعداد مشخص؛ انتخاب فقط از گزینه مجاز؛ موجودی از اجزا |
| کد تخفیف | یک کد؛ پکیج پیش‌فرض مستثنا، اقلام مستقل می‌توانند مشمول باشند |
| هزینه | نرخ نامشخص با «— / Unknown»؛ صفر با «۰ / 0» |
| چاپ | برگ، صفحه، روی چاپ‌شده و نرخ دورو برچسب جدا دارند |
| چهار نوع مبلغ | قیمت فروش، برآورد جایگزینی، هزینه واقعی انبار، هزینه تاریخی سفارش جدا |
| قیمت پیشنهادی | انتشار دستی؛ هشدار یا محاسبه به معنی تغییر قیمت عمومی نیست |
| حسابداری | دریافت، فروش و تسویه سه رخداد؛ سود برآوردی از تحقق‌یافته جدا |
| نقاشی | سفارشی جدا؛ قلم منتظر تأیید پرداخت‌پذیر نیست |
| فایل | پیش‌نمایش عمومی و فایل چاپ خصوصی جدا؛ download مشتری با مجوز |

### ۲.۱ متن مشترک دو‌زبانه

| فارسی | English |
|---|---|
| ذخیره / لغو / بازگشت | Save / Cancel / Back |
| در حال بارگذاری… | Loading… |
| نتیجه‌ای پیدا نشد | No results found |
| اطلاعاتی برای نمایش وجود ندارد | No data to display |
| دوباره تلاش کنید | Try again |
| با موفقیت ذخیره شد | Saved successfully |
| این فیلد الزامی است | This field is required |
| اتصال برقرار نیست؛ اطلاعات شما حفظ شده است | You're offline; your input has been kept |
| به این بخش دسترسی ندارید | You don't have access to this section |
| قیمت تغییر کرده است؛ لطفاً بررسی کنید | The price has changed; please review |
| موجود / ناموجود | In stock / Out of stock |
| هزینه نامشخص | Unknown cost |
| نیازمند بازبینی قیمت | Price review required |
| محاسبه ناقص | Incomplete calculation |

## ۳. فهرست صفحات

جدول زیر قرارداد مسیر پیشنهادی، نقش و ترتیب طراحی را ارائه می‌کند. هر ردیف یک صفحه یا نمای مستقل قابل تحویل است؛ create/edit فقط در همان موجودیت می‌تواند با یک الگوی فرم مشترک ساخته شود.

| شناسه | صفحه | مسیر پیشنهادی | گروه |
|---|---|---|---|
| [PUB-01](#pub-01) | صفحه اصلی / Home | `/` | ۴ |
| [PUB-02](#pub-02) | فهرست کالکشن‌ها / Collections | `/collections` | ۴ |
| [PUB-03](#pub-03) | جزئیات کالکشن / Collection Detail | `/collections/:slug` | ۴ |
| [PUB-04](#pub-04) | فروشگاه و دسته / Shop & Category | `/shop و /categories/:slug` | ۴ |
| [PUB-05](#pub-05) | جست‌وجو / Search | `/search?q=` | ۴ |
| [PUB-06](#pub-06) | جزئیات محصول و انتخاب SKU / Product Detail | `/products/:slug` | ۴ |
| [PUB-07](#pub-07) | فهرست پکیج‌ها / Bundles | `/bundles` | ۴ |
| [PUB-08](#pub-08) | جزئیات پکیج / Bundle Detail | `/bundles/:slug` | ۴ |
| [PUB-09](#pub-09) | سبد خرید / Cart | `/cart` | ۴ |
| [PUB-10](#pub-10) | checkout: هویت و مرور / Checkout Review | `/checkout` | ۴ |
| [PUB-11](#pub-11) | checkout: آدرس / Checkout Address | `/checkout/address` | ۴ |
| [PUB-12](#pub-12) | checkout: روش ارسال / Delivery Method | `/checkout/delivery` | ۴ |
| [PUB-13](#pub-13) | checkout: پرداخت / Payment | `/checkout/payment` | ۴ |
| [PUB-14](#pub-14) | وضعیت نامشخص پرداخت / Payment Verification | `/checkout/verifying/:attempt` | ۴ |
| [PUB-15](#pub-15) | پرداخت موفق / Payment Success | `/checkout/success/:order` | ۴ |
| [PUB-16](#pub-16) | پرداخت ناموفق یا لغوشده / Payment Recovery | `/checkout/failed/:attempt` | ۴ |
| [PUB-17](#pub-17) | پیگیری مهمان / Guest Tracking | `/track-order` | ۴ |
| [PUB-18](#pub-18) | درباره ما / About | `/about` | ۴ |
| [PUB-19](#pub-19) | تماس / Contact | `/contact` | ۴ |
| [PUB-20](#pub-20) | سؤالات متداول / FAQ | `/faq` | ۴ |
| [PUB-21](#pub-21) | راهنمای انتخاب / Buying Guide | `/guides/:slug` | ۴ |
| [PUB-22](#pub-22) | قوانین خرید / Terms | `/terms` | ۴ |
| [PUB-23](#pub-23) | حریم خصوصی / Privacy | `/privacy` | ۴ |
| [PUB-24](#pub-24) | شرایط لغو و مرجوعی / Return Policy | `/returns-policy` | ۴ |
| [PAINT-01](#paint-01) | گالری نقاشی / Art Gallery | `/artworks` | ۵ |
| [PAINT-02](#paint-02) | جزئیات نقاشی آماده / Artwork Detail | `/artworks/:slug` | ۵ |
| [PAINT-03](#paint-03) | شروع سفارش نقاشی / Commission Start | `/commissions/new` | ۵ |
| [PAINT-04](#paint-04) | عکس و توضیحات / References & Brief | `/commissions/:draft/brief` | ۵ |
| [PAINT-05](#paint-05) | سبک، سایز و اجرا / Style & Execution | `/commissions/:draft/options` | ۵ |
| [PAINT-06](#paint-06) | تحلیل AI / AI Analysis | `/commissions/:draft/analysis` | ۵ |
| [PAINT-07](#paint-07) | قیمت و بررسی هنرمند / Commission Quote | `/commissions/:draft/quote` | ۵ |
| [AUTH-01](#auth-01) | انتخاب روش ورود / Sign-in Method | `/auth` | ۶ |
| [AUTH-02](#auth-02) | ورود با رمز / Password Login | `/auth/password` | ۶ |
| [AUTH-03](#auth-03) | تلفن ورود OTP / OTP Phone | `/auth/otp` | ۶ |
| [AUTH-04](#auth-04) | تلفن ثبت‌نام / Register Phone | `/auth/register` | ۶ |
| [AUTH-05](#auth-05) | تأیید OTP / Verify Code | `/auth/verify` | ۶ |
| [AUTH-06](#auth-06) | ساخت رمز ثبت‌نام / Create Password | `/auth/register/password` | ۶ |
| [AUTH-07](#auth-07) | فراموشی رمز / Forgot Password | `/auth/forgot` | ۶ |
| [AUTH-08](#auth-08) | رمز جدید / Reset Password | `/auth/reset` | ۶ |
| [AUTH-09](#auth-09) | نشست منقضی / Session Expired | `/auth/session-expired` | ۶ |
| [AUTH-10](#auth-10) | حساب محدود / Account Restricted | `/auth/restricted` | ۶ |
| [AUTH-11](#auth-11) | خروج از حساب / Sign-out | `/auth/sign-out` | ۶ |
| [USER-01](#user-01) | داشبورد مشتری / Customer Dashboard | `/account` | ۷ |
| [USER-02](#user-02) | فهرست سفارش‌ها / Orders | `/account/orders` | ۷ |
| [USER-03](#user-03) | جزئیات سفارش / Order Detail | `/account/orders/:id` | ۷ |
| [USER-04](#user-04) | رسید و فاکتور / Receipt | `/account/orders/:id/invoice` | ۷ |
| [USER-05](#user-05) | درخواست لغو / Cancellation Request | `/account/orders/:id/cancel` | ۷ |
| [USER-06](#user-06) | درخواست مرجوعی / Return Request | `/account/orders/:id/return` | ۷ |
| [USER-07](#user-07) | وضعیت مرجوعی و وجه / Return & Refund Status | `/account/returns/:id` | ۷ |
| [USER-08](#user-08) | دانلودها / Digital Downloads | `/account/downloads` | ۷ |
| [USER-09](#user-09) | تأیید طرح و اصلاحات / Artwork Approval | `/account/commissions/:id/review` | ۷ |
| [USER-10](#user-10) | علاقه‌مندی / Favorites | `/account/favorites` | ۷ |
| [USER-11](#user-11) | آدرس‌ها / Addresses | `/account/addresses` | ۷ |
| [USER-12](#user-12) | پروفایل / Profile | `/account/profile` | ۷ |
| [USER-13](#user-13) | امنیت / Security | `/account/security` | ۷ |
| [USER-14](#user-14) | تنظیمات زبان و اعلان / Preferences | `/account/preferences` | ۷ |
| [USER-15](#user-15) | پشتیبانی و تیکت جدید / Support | `/account/support` | ۷ |
| [USER-16](#user-16) | جزئیات تیکت / Ticket Thread | `/account/support/:id` | ۷ |
| [USER-17](#user-17) | اعلان‌ها / Notifications | `/account/notifications` | ۷ |
| [ART-01](#art-01) | داشبورد هنرمند / Artist Dashboard | `/artist` | ۸ |
| [ART-02](#art-02) | سفارش‌های هنرمند / Assigned Orders | `/artist/orders` | ۸ |
| [ART-03](#art-03) | بررسی سفارش / Artist Order Detail | `/artist/orders/:id` | ۸ |
| [ART-04](#art-04) | بررسی ضریب سختی / Difficulty Review | `/artist/orders/:id/difficulty` | ۸ |
| [ART-05](#art-05) | اجرای سفارش / Production Workspace | `/artist/orders/:id/work` | ۸ |
| [ART-06](#art-06) | سوابق هنرمند / Artist History | `/artist/history` | ۸ |
| [ART-07](#art-07) | پروفایل و تنظیمات هنرمند / Artist Profile | `/artist/profile` | ۸ |
| [ADM-01](#adm-01) | داشبورد ادمین / Admin Dashboard | `/admin` | ۹ |
| [ADM-02](#adm-02) | مدیریت کالکشن / Collections Admin | `/admin/collections` | ۹ |
| [ADM-03](#adm-03) | مدیریت دسته / Categories Admin | `/admin/categories` | ۹ |
| [ADM-04](#adm-04) | فهرست محصولات / Products Admin | `/admin/products` | ۹ |
| [ADM-05](#adm-05) | فرم محصول / Product Editor | `/admin/products/:id/edit` | ۹ |
| [ADM-06](#adm-06) | گزینه‌ها و SKU / Variant Matrix | `/admin/products/:id/variants` | ۹ |
| [ADM-07](#adm-07) | مدیریت پکیج / Bundles Admin | `/admin/bundles` | ۹ |
| [ADM-08](#adm-08) | فرم پکیج / Bundle Editor | `/admin/bundles/:id/edit` | ۹ |
| [ADM-09](#adm-09) | کدهای تخفیف / Discounts Admin | `/admin/discounts` | ۹ |
| [ADM-10](#adm-10) | فرم کد تخفیف / Discount Editor | `/admin/discounts/:id/edit` | ۹ |
| [ADM-11](#adm-11) | رسانه و فایل چاپ / Media Library | `/admin/media` | ۹ |
| [ADM-12](#adm-12) | آثار نقاشی / Artwork Admin | `/admin/artworks` | ۹ |
| [ADM-13](#adm-13) | کاربران و دسترسی / Users & Roles | `/admin/users` | ۹ |
| [ADM-14](#adm-14) | هنرمندان / Artists Admin | `/admin/artists` | ۹ |
| [ADM-15](#adm-15) | محتوا و پشتیبانی / Content Admin | `/admin/content` | ۹ |
| [ADM-16](#adm-16) | تنظیمات کسب‌وکار / Business Settings | `/admin/settings` | ۹ |
| [COST-01](#cost-01) | فهرست مواد / Materials | `/admin/materials` | ۱۰ |
| [COST-02](#cost-02) | تعریف ماده و تبدیل واحد / Material Editor | `/admin/materials/:id/edit` | ۱۰ |
| [COST-03](#cost-03) | نرخ خدمات / Service Rates | `/admin/service-rates` | ۱۰ |
| [COST-04](#cost-04) | فرمول‌های ساخت / BOM Library | `/admin/boms` | ۱۰ |
| [COST-05](#cost-05) | ویرایش فرمول ساخت / BOM Editor | `/admin/boms/:id/edit` | ۱۰ |
| [COST-06](#cost-06) | بازده برش و ضایعات / Cutting Yield | `/admin/costing/cutting` | ۱۰ |
| [COST-07](#cost-07) | محاسبه‌گر هزینه SKU / SKU Cost Calculator | `/admin/costing` | ۱۰ |
| [COST-08](#cost-08) | قیمت پیشنهادی SKU / Price Proposal | `/admin/pricing/:sku` | ۱۰ |
| [COST-09](#cost-09) | صف بازبینی قیمت / Price Review Queue | `/admin/pricing/reviews` | ۱۰ |
| [COST-10](#cost-10) | تأیید انتشار و تاریخچه / Price Publication | `/admin/pricing/reviews/:id` | ۱۰ |
| [OPS-01](#ops-01) | نمای انبار / Inventory | `/admin/inventory` | ۱۱ |
| [OPS-02](#ops-02) | گردش و رزرو موجودی / Stock Ledger | `/admin/inventory/:item/movements` | ۱۱ |
| [OPS-03](#ops-03) | موجودی افتتاحیه و اصلاح / Stock Adjustment | `/admin/inventory/adjustments/new` | ۱۱ |
| [OPS-04](#ops-04) | تأمین‌کننده و مانده / Suppliers | `/admin/suppliers` | ۱۱ |
| [OPS-05](#ops-05) | فهرست خرید / Purchases | `/admin/purchases` | ۱۱ |
| [OPS-06](#ops-06) | سند خرید / Purchase Editor | `/admin/purchases/:id` | ۱۱ |
| [OPS-07](#ops-07) | تحویل و برگشت خرید / Purchase Receipt | `/admin/purchases/:id/receipts/new` | ۱۱ |
| [OPS-08](#ops-08) | دستورهای تولید / Production Orders | `/admin/production` | ۱۱ |
| [OPS-09](#ops-09) | اجرای بچ تولید / Production Batch | `/admin/production/:id` | ۱۱ |
| [OPS-10](#ops-10) | کنترل کیفیت و پایان تولید / Production QC | `/admin/production/:id/qc` | ۱۱ |
| [OPS-11](#ops-11) | ضایعات و خرابی / Waste & Damage | `/admin/waste` | ۱۱ |
| [FIN-01](#fin-01) | داشبورد مالی / Finance Overview | `/admin/finance` | ۱۲ |
| [FIN-02](#fin-02) | دریافت و پرداخت / Cash Movements | `/admin/finance/movements` | ۱۲ |
| [FIN-03](#fin-03) | بانک و صندوق / Accounts & Balances | `/admin/finance/accounts` | ۱۲ |
| [FIN-04](#fin-04) | هزینه‌های جاری / Operating Expenses | `/admin/finance/expenses` | ۱۲ |
| [FIN-05](#fin-05) | بدهی و مطالبات / Payables & Receivables | `/admin/finance/balances` | ۱۲ |
| [FIN-06](#fin-06) | پرداخت‌ها و رسیدها / Transactions | `/admin/finance/payments` | ۱۲ |
| [FIN-07](#fin-07) | تسویه درگاه / Gateway Settlement | `/admin/finance/settlements` | ۱۲ |
| [FIN-08](#fin-08) | بازپرداخت‌ها / Refund Processing | `/admin/finance/refunds` | ۱۲ |
| [FIN-09](#fin-09) | سود محصول، SKU و پکیج / Profit Report | `/admin/reports/profit` | ۱۲ |
| [FIN-10](#fin-10) | جریان نقدی / Cash Flow | `/admin/reports/cashflow` | ۱۲ |
| [FIN-11](#fin-11) | گزارش موجودی و تولید / Inventory & Production Report | `/admin/reports/inventory` | ۱۲ |
| [FIN-12](#fin-12) | خروجی حسابدار / Accounting Export | `/admin/finance/export` | ۱۲ |
| [ORDER-01](#order-01) | فهرست سفارش ادمین / Orders Admin | `/admin/orders` | ۱۳ |
| [ORDER-02](#order-02) | جزئیات عملیاتی سفارش / Operations Order | `/admin/orders/:id` | ۱۳ |
| [ORDER-03](#order-03) | آماده‌سازی و ارسال / Fulfillment | `/admin/shipments/:id` | ۱۳ |
| [ORDER-04](#order-04) | مرجوعی و کنترل کالا / Return Inspection | `/admin/returns/:id` | ۱۳ |
| [ORDER-05](#order-05) | صف بررسی سفارش نقاشی / Commission Review Admin | `/admin/commissions/reviews` | ۱۳ |
| [ORDER-06](#order-06) | پشتیبانی ادمین / Support Inbox | `/admin/support` | ۱۳ |
| [ORDER-07](#order-07) | لاگ و تاریخچه تغییر / Audit Log | `/admin/audit` | ۱۳ |
| [SYS-01](#sys-01) | خطای ۴۰۴ / Not Found | `/404` | ۱۴ |
| [SYS-02](#sys-02) | عدم دسترسی / Access Denied | `/403` | ۱۴ |
| [SYS-03](#sys-03) | قطع اتصال و اختلال / Offline & Service Error | `/error` | ۱۴ |
| [SYS-04](#sys-04) | تأیید و تغییر ذخیره‌نشده / Confirmation & Unsaved Changes | `modal / bottom sheet` | ۱۴ |
| [FUT-01](#fut-01) | خبرم‌کن و هدیه / Restock & Gift Options | `/future/restock و /future/gift` | ۱۵ |
| [FUT-02](#fut-02) | موکاپ زنده / Live Mockup | `/future/mockup/:id` | ۱۵ |
| [FUT-03](#fut-03) | AR و پیش‌نمایش سبک / AR & Style Preview | `/future/preview/:id` | ۱۵ |

## ۴. صفحات عمومی و خرید

<a id="pub-01"></a>

### PUB-01 — صفحه اصلی / Home

**1. نام و شناسه:** PUB-01 — صفحه اصلی / Home

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** کشف کالکشن و شروع خرید یا سفارش نقاشی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** header؛ hero دو ستونه با اثر و دو CTA؛ کالکشن‌های منتخب؛ دسته‌ها؛ پکیج‌ها؛ نقاشی‌ها؛ اعتماد/راهنما؛ footer.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: header؛ hero دو ستونه با اثر و دو CTA؛ کالکشن‌های منتخب؛ دسته‌ها؛ پکیج‌ها؛ نقاشی‌ها؛ اعتماد/راهنما؛ footer. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** دنیای کوچک هنر / A little world of art؛ کشف کالکشن‌ها / Explore collections؛ سفارش نقاشی / Commission artwork؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** CTA کالکشن به فهرست مرتبط؛ سفارش نقاشی به wizard؛ سبد و زبان در header؛ بخش خالی حذف شود، CTA خرید باقی بماند.

**9. اعتبارسنجی:** فقط محتوای منتشرشده؛ ادعای موجودی یا قیمت از داده واقعی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: سکشن بدون محتوا جایگزین «مشاهده فروشگاه»؛ خطای یک سکشن مانع کل صفحه نشود.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: hero تک‌ستونه؛ grid دو ستون؛ header فشرده با منو؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** کالکشن‌ها، دسته‌ها، محصولات موجود، پکیج‌ها، تصاویر و لینک‌ها؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** در viewport اول ورود به کالکشن و فروشگاه روشن باشد؛ هیچ هزینه داخلی یا موکاپ اجباری نباشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-01 — صفحه اصلی / Home
نقش و دسترسی: مهمان و مشتری
هدف: کشف کالکشن و شروع خرید یا سفارش نقاشی
مسیر و ورود/خروج: مسیر پیشنهادی: /. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: header؛ hero دو ستونه با اثر و دو CTA؛ کالکشن‌های منتخب؛ دسته‌ها؛ پکیج‌ها؛ نقاشی‌ها؛ اعتماد/راهنما؛ footer.
کامپوننت‌ها و CTA: اجزای اختصاصی: header؛ hero دو ستونه با اثر و دو CTA؛ کالکشن‌های منتخب؛ دسته‌ها؛ پکیج‌ها؛ نقاشی‌ها؛ اعتماد/راهنما؛ footer. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: دنیای کوچک هنر / A little world of art؛ کشف کالکشن‌ها / Explore collections؛ سفارش نقاشی / Commission artwork؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: CTA کالکشن به فهرست مرتبط؛ سفارش نقاشی به wizard؛ سبد و زبان در header؛ بخش خالی حذف شود، CTA خرید باقی بماند.
اعتبارسنجی: فقط محتوای منتشرشده؛ ادعای موجودی یا قیمت از داده واقعی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: سکشن بدون محتوا جایگزین «مشاهده فروشگاه»؛ خطای یک سکشن مانع کل صفحه نشود.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: hero تک‌ستونه؛ grid دو ستون؛ header فشرده با منو؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: کالکشن‌ها، دسته‌ها، محصولات موجود، پکیج‌ها، تصاویر و لینک‌ها؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: در viewport اول ورود به کالکشن و فروشگاه روشن باشد؛ هیچ هزینه داخلی یا موکاپ اجباری نباشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-02"></a>

### PUB-02 — فهرست کالکشن‌ها / Collections

**1. نام و شناسه:** PUB-02 — فهرست کالکشن‌ها / Collections

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** انتخاب دنیای تصویری

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/collections`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** عنوان؛ معرفی؛ grid بزرگ تصویر و نام گربه/روح/گاو/qolche/Love؛ footer.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: عنوان؛ معرفی؛ grid بزرگ تصویر و نام گربه/روح/گاو/qolche/Love؛ footer. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** کالکشن‌ها / Collections؛ مجموعه محبوبتان را پیدا کنید / Find your favorite collection؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** کارت به صفحه کالکشن؛ breadcrumb و بازگشت؛ نام‌ها قابل ترجمه.

**9. اعتبارسنجی:** فقط کالکشن منتشرشده؛ نام qolche از داده، بدون ترجمه حدسی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: خالی: معرفی و لینک فروشگاه؛ تصویر خراب fallback با نام.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: grid دو ستون موبایل و سه ستون دسکتاپ؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** شناسه، slug، نام fa/en، تصویر، توضیح، ترتیب؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** نام و تصویر هر کالکشن قابل کلیک؛ کالکشن با محصول مشترک انبار مستقل ندارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-02 — فهرست کالکشن‌ها / Collections
نقش و دسترسی: مهمان و مشتری
هدف: انتخاب دنیای تصویری
مسیر و ورود/خروج: مسیر پیشنهادی: /collections. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: عنوان؛ معرفی؛ grid بزرگ تصویر و نام گربه/روح/گاو/qolche/Love؛ footer.
کامپوننت‌ها و CTA: اجزای اختصاصی: عنوان؛ معرفی؛ grid بزرگ تصویر و نام گربه/روح/گاو/qolche/Love؛ footer. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: کالکشن‌ها / Collections؛ مجموعه محبوبتان را پیدا کنید / Find your favorite collection؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: کارت به صفحه کالکشن؛ breadcrumb و بازگشت؛ نام‌ها قابل ترجمه.
اعتبارسنجی: فقط کالکشن منتشرشده؛ نام qolche از داده، بدون ترجمه حدسی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: خالی: معرفی و لینک فروشگاه؛ تصویر خراب fallback با نام.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: grid دو ستون موبایل و سه ستون دسکتاپ؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: شناسه، slug، نام fa/en، تصویر، توضیح، ترتیب؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: نام و تصویر هر کالکشن قابل کلیک؛ کالکشن با محصول مشترک انبار مستقل ندارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-03"></a>

### PUB-03 — جزئیات کالکشن / Collection Detail

**1. نام و شناسه:** PUB-03 — جزئیات کالکشن / Collection Detail

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** دیدن همه محصولات و پکیج‌های همان کالکشن

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/collections/:slug`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** breadcrumb؛ hero کالکشن؛ توضیح؛ tabs همه/محصول/پکیج؛ فیلتر دسته/سایز/قیمت/موجودی؛ grid؛ pagination.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: breadcrumb؛ hero کالکشن؛ توضیح؛ tabs همه/محصول/پکیج؛ فیلتر دسته/سایز/قیمت/موجودی؛ grid؛ pagination. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** کالکشن گربه / Cat collection؛ همه محصولات / All products؛ پاک‌کردن فیلترها / Clear filters؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** فیلتر دفتر طراحی در گربه، کالکشن را حفظ کند؛ chips حذف مستقل؛ sort و URL حفظ شوند.

**9. اعتبارسنجی:** ترکیب فیلتر معتبر؛ محصول عضو چند کالکشن در grid تکرار نشود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: خالی فیلتر با reset؛ کالکشن یافت‌نشده به فهرست؛ ناموجود قابل نمایش.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: hero کوتاه؛ filter bottom sheet؛ chips قابل scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** محتوا، product IDs، bundle IDs، facets، available-price range؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-01/02: فیلتر همان کالکشن حفظ؛ کارت پکیج از محصول با label متمایز؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-03 — جزئیات کالکشن / Collection Detail
نقش و دسترسی: مهمان و مشتری
هدف: دیدن همه محصولات و پکیج‌های همان کالکشن
مسیر و ورود/خروج: مسیر پیشنهادی: /collections/:slug. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: breadcrumb؛ hero کالکشن؛ توضیح؛ tabs همه/محصول/پکیج؛ فیلتر دسته/سایز/قیمت/موجودی؛ grid؛ pagination.
کامپوننت‌ها و CTA: اجزای اختصاصی: breadcrumb؛ hero کالکشن؛ توضیح؛ tabs همه/محصول/پکیج؛ فیلتر دسته/سایز/قیمت/موجودی؛ grid؛ pagination. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: کالکشن گربه / Cat collection؛ همه محصولات / All products؛ پاک‌کردن فیلترها / Clear filters؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: فیلتر دفتر طراحی در گربه، کالکشن را حفظ کند؛ chips حذف مستقل؛ sort و URL حفظ شوند.
اعتبارسنجی: ترکیب فیلتر معتبر؛ محصول عضو چند کالکشن در grid تکرار نشود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: خالی فیلتر با reset؛ کالکشن یافت‌نشده به فهرست؛ ناموجود قابل نمایش.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: hero کوتاه؛ filter bottom sheet؛ chips قابل scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: محتوا، product IDs، bundle IDs، facets، available-price range؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-01/02: فیلتر همان کالکشن حفظ؛ کارت پکیج از محصول با label متمایز؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-04"></a>

### PUB-04 — فروشگاه و دسته / Shop & Category

**1. نام و شناسه:** PUB-04 — فروشگاه و دسته / Shop & Category

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** کشف بر اساس نوع محصول مستقل از کالکشن

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/shop و /categories/:slug`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** breadcrumb؛ عنوان دسته؛ search؛ فیلتر کالکشن/گرماژ/سایز/قیمت؛ sort؛ کارت کالا؛ صفحه‌بندی.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: breadcrumb؛ عنوان دسته؛ search؛ فیلتر کالکشن/گرماژ/سایز/قیمت؛ sort؛ کارت کالا؛ صفحه‌بندی. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** دفتر طراحی / Sketchbooks؛ از … تومان / From … toman؛ فقط موجودها / In stock only؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** تغییر دسته مسیر را تغییر دهد؛ انتخاب کالکشن فیلتر شود؛ favorite بعد auth مقصد را حفظ کند.

**9. اعتبارسنجی:** قیمت از کمترین SKU قابل خرید؛ بدون گزینه موجود label ناموجود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no-result با reset؛ خطای فهرست retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: دو ستون کارت؛ sort/filter در نوار؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** دسته، محصولات، facets، قیمت شروع، موجودی تجمیعی نمایشی؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** فیلتر گرماژ فقط در دسته مرتبط؛ هیچ SKU ناموجود از کارت خرید مستقیم نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-04 — فروشگاه و دسته / Shop & Category
نقش و دسترسی: مهمان و مشتری
هدف: کشف بر اساس نوع محصول مستقل از کالکشن
مسیر و ورود/خروج: مسیر پیشنهادی: /shop و /categories/:slug. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: breadcrumb؛ عنوان دسته؛ search؛ فیلتر کالکشن/گرماژ/سایز/قیمت؛ sort؛ کارت کالا؛ صفحه‌بندی.
کامپوننت‌ها و CTA: اجزای اختصاصی: breadcrumb؛ عنوان دسته؛ search؛ فیلتر کالکشن/گرماژ/سایز/قیمت؛ sort؛ کارت کالا؛ صفحه‌بندی. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: دفتر طراحی / Sketchbooks؛ از … تومان / From … toman؛ فقط موجودها / In stock only؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: تغییر دسته مسیر را تغییر دهد؛ انتخاب کالکشن فیلتر شود؛ favorite بعد auth مقصد را حفظ کند.
اعتبارسنجی: قیمت از کمترین SKU قابل خرید؛ بدون گزینه موجود label ناموجود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no-result با reset؛ خطای فهرست retry.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: دو ستون کارت؛ sort/filter در نوار؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: دسته، محصولات، facets، قیمت شروع، موجودی تجمیعی نمایشی؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: فیلتر گرماژ فقط در دسته مرتبط؛ هیچ SKU ناموجود از کارت خرید مستقیم نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-05"></a>

### PUB-05 — جست‌وجو / Search

**1. نام و شناسه:** PUB-05 — جست‌وجو / Search

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** یافتن محصول، کالکشن، پکیج و اثر

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/search?q=`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** input بزرگ؛ query؛ tabs همه/محصول/کالکشن/پکیج/نقاشی؛ فیلتر؛ نتایج و پیشنهاد.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: input بزرگ؛ query؛ tabs همه/محصول/کالکشن/پکیج/نقاشی؛ فیلتر؛ نتایج و پیشنهاد. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** جست‌وجوی هنر و محصولات / Search art and products؛ نتیجه‌ای پیدا نشد / No results found؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** debounce؛ submit و history؛ نتایج گروه‌بندی؛ لینک مستقیم به detail.

**9. اعتبارسنجی:** query خالی پیشنهادها؛ حفظ فاصله/زبان؛ input نامحدود غیرقابل کنترل نباشد؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بدون نتیجه با واژه پیشنهادی؛ offline query حفظ.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: input تمام‌عرض؛ suggestion list زیر آن؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** query، نوع نتیجه، snippet، thumbnails، pagination؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** Enter جست‌وجو را اجرا؛ تغییر tab query را پاک نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-05 — جست‌وجو / Search
نقش و دسترسی: مهمان و مشتری
هدف: یافتن محصول، کالکشن، پکیج و اثر
مسیر و ورود/خروج: مسیر پیشنهادی: /search?q=. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: input بزرگ؛ query؛ tabs همه/محصول/کالکشن/پکیج/نقاشی؛ فیلتر؛ نتایج و پیشنهاد.
کامپوننت‌ها و CTA: اجزای اختصاصی: input بزرگ؛ query؛ tabs همه/محصول/کالکشن/پکیج/نقاشی؛ فیلتر؛ نتایج و پیشنهاد. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: جست‌وجوی هنر و محصولات / Search art and products؛ نتیجه‌ای پیدا نشد / No results found؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: debounce؛ submit و history؛ نتایج گروه‌بندی؛ لینک مستقیم به detail.
اعتبارسنجی: query خالی پیشنهادها؛ حفظ فاصله/زبان؛ input نامحدود غیرقابل کنترل نباشد؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بدون نتیجه با واژه پیشنهادی؛ offline query حفظ.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: input تمام‌عرض؛ suggestion list زیر آن؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: query، نوع نتیجه، snippet، thumbnails، pagination؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: Enter جست‌وجو را اجرا؛ تغییر tab query را پاک نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-06"></a>

### PUB-06 — جزئیات محصول و انتخاب SKU / Product Detail

**1. نام و شناسه:** PUB-06 — جزئیات محصول و انتخاب SKU / Product Detail

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** انتخاب سایز، برگ، جلد و تعداد دفتر موجود

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/products/:slug`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** breadcrumb کالکشن/دسته؛ گالری؛ عنوان دفتر طراحی ۱۲۷ گرم؛ گرماژ ثابت؛ selector سایز A4/A5/A6؛ تعداد برگ؛ جلد/صحافی فعال؛ quantity با label تعداد دفتر؛ قیمت واحد/کل؛ موجودی؛ CTA؛ مشخصات و مرجوعی؛ پکیج مرتبط.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: breadcrumb کالکشن/دسته؛ گالری؛ عنوان دفتر طراحی ۱۲۷ گرم؛ گرماژ ثابت؛ selector سایز A4/A5/A6؛ تعداد برگ؛ جلد/صحافی فعال؛ quantity با label تعداد دفتر؛ قیمت واحد/کل؛ موجودی؛ CTA؛ مشخصات و مرجوعی؛ پکیج مرتبط. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تعداد برگ هر دفتر / Sheets per notebook؛ تعداد دفتر / Number of notebooks؛ ۵۰ برگ، ۱۰۰ صفحه / 50 sheets, 100 pages؛ افزودن به سبد / Add to cart؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** انتخاب گزینه SKU/تصویر/وزن/قیمت را هم‌زمان به‌روز کند؛ ناسازگار disabled با دلیل؛ ناموجود label جدا؛ تغییر تعداد دفتر فقط مبلغ ردیف؛ افزودن موفق drawer سبد.

**9. اعتبارسنجی:** ترکیب تعریف‌شده؛ تعداد صحیح ۱ تا موجودی؛ داده pending مانع افزودن؛ برگ از مقادیر مجاز نه free text؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: SKU ناموجود CTA disabled؛ تغییر قیمت/stock در افزودن با بازبینی؛ تصویر fallback؛ بدون variant دعوت انتخاب.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: گالری بالا؛ selector عمودی؛ CTA و قیمت sticky پایین با فضای safe-area؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** product، variants، selected SKU، تصویر، gsm، sheetCount، unitPrice، availableStock، quantity، weight، policies؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-03/04/05: تعداد خرید مستقل؛ هیچ مسیر پیش‌فروش؛ قیمت و موجودی دقیق SKU؛ cost/margin عمومی نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-06 — جزئیات محصول و انتخاب SKU / Product Detail
نقش و دسترسی: مهمان و مشتری
هدف: انتخاب سایز، برگ، جلد و تعداد دفتر موجود
مسیر و ورود/خروج: مسیر پیشنهادی: /products/:slug. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: breadcrumb کالکشن/دسته؛ گالری؛ عنوان دفتر طراحی ۱۲۷ گرم؛ گرماژ ثابت؛ selector سایز A4/A5/A6؛ تعداد برگ؛ جلد/صحافی فعال؛ quantity با label تعداد دفتر؛ قیمت واحد/کل؛ موجودی؛ CTA؛ مشخصات و مرجوعی؛ پکیج مرتبط.
کامپوننت‌ها و CTA: اجزای اختصاصی: breadcrumb کالکشن/دسته؛ گالری؛ عنوان دفتر طراحی ۱۲۷ گرم؛ گرماژ ثابت؛ selector سایز A4/A5/A6؛ تعداد برگ؛ جلد/صحافی فعال؛ quantity با label تعداد دفتر؛ قیمت واحد/کل؛ موجودی؛ CTA؛ مشخصات و مرجوعی؛ پکیج مرتبط. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تعداد برگ هر دفتر / Sheets per notebook؛ تعداد دفتر / Number of notebooks؛ ۵۰ برگ، ۱۰۰ صفحه / 50 sheets, 100 pages؛ افزودن به سبد / Add to cart؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: انتخاب گزینه SKU/تصویر/وزن/قیمت را هم‌زمان به‌روز کند؛ ناسازگار disabled با دلیل؛ ناموجود label جدا؛ تغییر تعداد دفتر فقط مبلغ ردیف؛ افزودن موفق drawer سبد.
اعتبارسنجی: ترکیب تعریف‌شده؛ تعداد صحیح ۱ تا موجودی؛ داده pending مانع افزودن؛ برگ از مقادیر مجاز نه free text؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: SKU ناموجود CTA disabled؛ تغییر قیمت/stock در افزودن با بازبینی؛ تصویر fallback؛ بدون variant دعوت انتخاب.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: گالری بالا؛ selector عمودی؛ CTA و قیمت sticky پایین با فضای safe-area؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: product، variants، selected SKU، تصویر، gsm، sheetCount، unitPrice، availableStock، quantity، weight، policies؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-03/04/05: تعداد خرید مستقل؛ هیچ مسیر پیش‌فروش؛ قیمت و موجودی دقیق SKU؛ cost/margin عمومی نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-07"></a>

### PUB-07 — فهرست پکیج‌ها / Bundles

**1. نام و شناسه:** PUB-07 — فهرست پکیج‌ها / Bundles

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** کشف بسته‌های چندمحصولی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/bundles`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** hero؛ فیلتر کالکشن؛ کارت پکیج شامل thumbnails اجزا، تعداد، تخفیف و قیمت شروع؛ pagination.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: hero؛ فیلتر کالکشن؛ کارت پکیج شامل thumbnails اجزا، تعداد، تخفیف و قیمت شروع؛ pagination. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پکیج‌های هنری / Art bundles؛ با هم، به‌صرفه‌تر / Better together؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** کارت به پکیج؛ قیمت ترکیب شروع موجود؛ نمایش ذخیره مبلغ بدون درصد ساختگی.

**9. اعتبارسنجی:** تخفیف و قیمت از ترکیب واقعی؛ ناموجود شفاف؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty لینک فروشگاه؛ ناموجود برچسب.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: کارت تمام‌عرض یا دو ستون بسته به عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** bundle، اجزا، دامنه گزینه، تخفیف، availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** پکیج از تخفیف صرف یک محصول قابل تمایز باشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-07 — فهرست پکیج‌ها / Bundles
نقش و دسترسی: مهمان و مشتری
هدف: کشف بسته‌های چندمحصولی
مسیر و ورود/خروج: مسیر پیشنهادی: /bundles. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: hero؛ فیلتر کالکشن؛ کارت پکیج شامل thumbnails اجزا، تعداد، تخفیف و قیمت شروع؛ pagination.
کامپوننت‌ها و CTA: اجزای اختصاصی: hero؛ فیلتر کالکشن؛ کارت پکیج شامل thumbnails اجزا، تعداد، تخفیف و قیمت شروع؛ pagination. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پکیج‌های هنری / Art bundles؛ با هم، به‌صرفه‌تر / Better together؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: کارت به پکیج؛ قیمت ترکیب شروع موجود؛ نمایش ذخیره مبلغ بدون درصد ساختگی.
اعتبارسنجی: تخفیف و قیمت از ترکیب واقعی؛ ناموجود شفاف؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty لینک فروشگاه؛ ناموجود برچسب.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: کارت تمام‌عرض یا دو ستون بسته به عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: bundle، اجزا، دامنه گزینه، تخفیف، availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: پکیج از تخفیف صرف یک محصول قابل تمایز باشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-08"></a>

### PUB-08 — جزئیات پکیج / Bundle Detail

**1. نام و شناسه:** PUB-08 — جزئیات پکیج / Bundle Detail

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** انتخاب گزینه اجزا و خرید یک مجموعه

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/bundles/:slug`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** hero پکیج؛ فهرست اجباری اجزا با تعداد؛ selector گزینه هر جزء؛ قیمت مستقل/تخفیف/نهایی؛ quantity پکیج؛ موجودی؛ توضیح کد؛ CTA.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: hero پکیج؛ فهرست اجباری اجزا با تعداد؛ selector گزینه هر جزء؛ قیمت مستقل/تخفیف/نهایی؛ quantity پکیج؛ موجودی؛ توضیح کد؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** این پکیج شامل / This bundle includes؛ تعداد پکیج / Bundle quantity؛ تخفیف پکیج / Bundle discount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** انتخاب سایز دفتر مبلغ/ظرفیت را به‌روز کند؛ جزء اجباری حذف‌پذیر نیست؛ SKU مشترک ظرفیت تجمیعی دارد.

**9. اعتبارسنجی:** فقط گزینه‌های مجاز؛ همه اجزا معتبر/موجود؛ تعداد پکیج <= ظرفیت؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: یک جزء ناموجود با گزینه جایگزین مجاز؛ تخفیف از مبلغ تجاوز نکند؛ recalculating CTA قفل.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: اجزا در کارت‌های عمودی؛ خلاصه قیمت چسبان؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** components، required quantities، allowed SKU، prices، aggregated capacity، discount policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-06/07: موجودی از اجزا؛ انبار مجزا ندارد؛ کد پیش‌فرض جمع نمی‌شود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-08 — جزئیات پکیج / Bundle Detail
نقش و دسترسی: مهمان و مشتری
هدف: انتخاب گزینه اجزا و خرید یک مجموعه
مسیر و ورود/خروج: مسیر پیشنهادی: /bundles/:slug. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: hero پکیج؛ فهرست اجباری اجزا با تعداد؛ selector گزینه هر جزء؛ قیمت مستقل/تخفیف/نهایی؛ quantity پکیج؛ موجودی؛ توضیح کد؛ CTA.
کامپوننت‌ها و CTA: اجزای اختصاصی: hero پکیج؛ فهرست اجباری اجزا با تعداد؛ selector گزینه هر جزء؛ قیمت مستقل/تخفیف/نهایی؛ quantity پکیج؛ موجودی؛ توضیح کد؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: این پکیج شامل / This bundle includes؛ تعداد پکیج / Bundle quantity؛ تخفیف پکیج / Bundle discount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: انتخاب سایز دفتر مبلغ/ظرفیت را به‌روز کند؛ جزء اجباری حذف‌پذیر نیست؛ SKU مشترک ظرفیت تجمیعی دارد.
اعتبارسنجی: فقط گزینه‌های مجاز؛ همه اجزا معتبر/موجود؛ تعداد پکیج <= ظرفیت؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: یک جزء ناموجود با گزینه جایگزین مجاز؛ تخفیف از مبلغ تجاوز نکند؛ recalculating CTA قفل.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: اجزا در کارت‌های عمودی؛ خلاصه قیمت چسبان؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: components، required quantities، allowed SKU، prices، aggregated capacity، discount policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-06/07: موجودی از اجزا؛ انبار مجزا ندارد؛ کد پیش‌فرض جمع نمی‌شود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-09"></a>

### PUB-09 — سبد خرید / Cart

**1. نام و شناسه:** PUB-09 — سبد خرید / Cart

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** بازبینی کالا، پکیج و نقاشی پیش از checkout

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/cart`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** اقلام مستقل؛ پکیج expandable با اجزا؛ قلم نقاشی منتظر بررسی؛ quantity/edit/remove؛ کد؛ subtotal/discount/shipping estimate؛ CTA.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: اقلام مستقل؛ پکیج expandable با اجزا؛ قلم نقاشی منتظر بررسی؛ quantity/edit/remove؛ کد؛ subtotal/discount/shipping estimate؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سبد خرید / Shopping cart؛ سبد، موجودی را رزرو نمی‌کند / Your cart does not reserve stock؛ فقط اقلام آماده / Checkout ready items؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** پکیج واحد حذف/تعداد؛ آماده‌ها را جدا از نقاشی pending پرداخت کند؛ حذف با undo؛ کد نشان دهد کدام ردیف مشمول نیست.

**9. اعتبارسنجی:** یک کد؛ تعداد تا موجودی؛ بدون ثبت مصرف نهایی در سبد؛ قیمت تغییرکرده نیاز تأیید؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty دو CTA فروشگاه/کالکشن؛ stock/price delta banner؛ invalid/expired code؛ pending artwork explanation.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: کارت اقلام؛ summary collapse؛ sticky checkout؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** line snapshots، component choices، quote status، eligibility، coupon، totals؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-07: کد اقلام مستقل را تخفیف دهد حتی با پکیج مستثنا؛ مجموع درست؛ قلم pending بدون پرداخت؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-09 — سبد خرید / Cart
نقش و دسترسی: مهمان و مشتری
هدف: بازبینی کالا، پکیج و نقاشی پیش از checkout
مسیر و ورود/خروج: مسیر پیشنهادی: /cart. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: اقلام مستقل؛ پکیج expandable با اجزا؛ قلم نقاشی منتظر بررسی؛ quantity/edit/remove؛ کد؛ subtotal/discount/shipping estimate؛ CTA.
کامپوننت‌ها و CTA: اجزای اختصاصی: اقلام مستقل؛ پکیج expandable با اجزا؛ قلم نقاشی منتظر بررسی؛ quantity/edit/remove؛ کد؛ subtotal/discount/shipping estimate؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سبد خرید / Shopping cart؛ سبد، موجودی را رزرو نمی‌کند / Your cart does not reserve stock؛ فقط اقلام آماده / Checkout ready items؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: پکیج واحد حذف/تعداد؛ آماده‌ها را جدا از نقاشی pending پرداخت کند؛ حذف با undo؛ کد نشان دهد کدام ردیف مشمول نیست.
اعتبارسنجی: یک کد؛ تعداد تا موجودی؛ بدون ثبت مصرف نهایی در سبد؛ قیمت تغییرکرده نیاز تأیید؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty دو CTA فروشگاه/کالکشن؛ stock/price delta banner؛ invalid/expired code؛ pending artwork explanation.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: کارت اقلام؛ summary collapse؛ sticky checkout؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: line snapshots، component choices، quote status، eligibility، coupon، totals؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-07: کد اقلام مستقل را تخفیف دهد حتی با پکیج مستثنا؛ مجموع درست؛ قلم pending بدون پرداخت؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-10"></a>

### PUB-10 — checkout: هویت و مرور / Checkout Review

**1. نام و شناسه:** PUB-10 — checkout: هویت و مرور / Checkout Review

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** تأیید هویت و اقلام پرداخت‌پذیر

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** stepper هویت/آدرس/ارسال/پرداخت؛ تلفن تأییدشده؛ login/register در صورت نیاز؛ اقلام؛ تغییرها؛ next.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: stepper هویت/آدرس/ارسال/پرداخت؛ تلفن تأییدشده؛ login/register در صورت نیاز؛ اقلام؛ تغییرها؛ next. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مرور سفارش / Review order؛ شماره تأییدشده / Verified phone؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** auth مقصد/سبد را حفظ؛ پس از ورود merge سبد با رفع تعارض؛ فقط اقلام نهایی انتخاب‌شده.

**9. اعتبارسنجی:** شماره تأییدشده قبل پرداخت؛ تایید تغییر قیمت؛ قلم منتظر review کنار گذاشته شود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: session expired بازگشت auth؛ unavailable item به اصلاح سبد؛ empty checkout به cart.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: stepper کوتاه؛ summary accordion؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** customer، verified phone، selected lines، changes، cart version؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** هیچ ادعای رزرو قبل شروع پرداخت؛ auth سبد را پاک نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-10 — checkout: هویت و مرور / Checkout Review
نقش و دسترسی: مهمان و مشتری
هدف: تأیید هویت و اقلام پرداخت‌پذیر
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: stepper هویت/آدرس/ارسال/پرداخت؛ تلفن تأییدشده؛ login/register در صورت نیاز؛ اقلام؛ تغییرها؛ next.
کامپوننت‌ها و CTA: اجزای اختصاصی: stepper هویت/آدرس/ارسال/پرداخت؛ تلفن تأییدشده؛ login/register در صورت نیاز؛ اقلام؛ تغییرها؛ next. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مرور سفارش / Review order؛ شماره تأییدشده / Verified phone؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: auth مقصد/سبد را حفظ؛ پس از ورود merge سبد با رفع تعارض؛ فقط اقلام نهایی انتخاب‌شده.
اعتبارسنجی: شماره تأییدشده قبل پرداخت؛ تایید تغییر قیمت؛ قلم منتظر review کنار گذاشته شود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: session expired بازگشت auth؛ unavailable item به اصلاح سبد؛ empty checkout به cart.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: stepper کوتاه؛ summary accordion؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: customer، verified phone، selected lines، changes، cart version؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: هیچ ادعای رزرو قبل شروع پرداخت؛ auth سبد را پاک نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-11"></a>

### PUB-11 — checkout: آدرس / Checkout Address

**1. نام و شناسه:** PUB-11 — checkout: آدرس / Checkout Address

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** انتخاب مقصد اقلام فیزیکی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout/address`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** saved cards؛ افزودن/ویرایش؛ گیرنده/تلفن/استان/شهر/نشانی/کدپستی؛ خلاصه اقلام؛ ادامه.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: saved cards؛ افزودن/ویرایش؛ گیرنده/تلفن/استان/شهر/نشانی/کدپستی؛ خلاصه اقلام؛ ادامه. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** آدرس تحویل / Delivery address؛ این سفارش ارسال فیزیکی ندارد / This order needs no physical shipping؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** انتخاب default؛ افزودن modal desktop/sheet mobile؛ تغییر مقصد هزینه ارسال را invalid کند.

**9. اعتبارسنجی:** required و policy کشور؛ شهر وابسته استان؛ تلفن صحیح؛ داده server-driven؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بدون آدرس فرم؛ digital-only skip با توضیح؛ خطای save حفظ فرم.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: فرم تک‌ستونه؛ postcode/tel LTR؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** addresses، destination rules، physical items؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-21: فقط دیجیتال مرحله را رد؛ سبد مختلط آدرس دارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-11 — checkout: آدرس / Checkout Address
نقش و دسترسی: مهمان و مشتری
هدف: انتخاب مقصد اقلام فیزیکی
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout/address. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: saved cards؛ افزودن/ویرایش؛ گیرنده/تلفن/استان/شهر/نشانی/کدپستی؛ خلاصه اقلام؛ ادامه.
کامپوننت‌ها و CTA: اجزای اختصاصی: saved cards؛ افزودن/ویرایش؛ گیرنده/تلفن/استان/شهر/نشانی/کدپستی؛ خلاصه اقلام؛ ادامه. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: آدرس تحویل / Delivery address؛ این سفارش ارسال فیزیکی ندارد / This order needs no physical shipping؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: انتخاب default؛ افزودن modal desktop/sheet mobile؛ تغییر مقصد هزینه ارسال را invalid کند.
اعتبارسنجی: required و policy کشور؛ شهر وابسته استان؛ تلفن صحیح؛ داده server-driven؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بدون آدرس فرم؛ digital-only skip با توضیح؛ خطای save حفظ فرم.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: فرم تک‌ستونه؛ postcode/tel LTR؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: addresses، destination rules، physical items؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-21: فقط دیجیتال مرحله را رد؛ سبد مختلط آدرس دارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-12"></a>

### PUB-12 — checkout: روش ارسال / Delivery Method

**1. نام و شناسه:** PUB-12 — checkout: روش ارسال / Delivery Method

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** انتخاب حمل و آگاهی از تحویل جداگانه

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout/delivery`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** مقصد؛ radio روش‌ها با هزینه/بازه؛ مرسوله‌ها؛ اقلام دیجیتال؛ خلاصه total.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: مقصد؛ radio روش‌ها با هزینه/بازه؛ مرسوله‌ها؛ اقلام دیجیتال؛ خلاصه total. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** روش ارسال / Delivery method؛ زمان تقریبی / Estimated delivery؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** تغییر روش/مقصد recalculation؛ تفکیک زمان نقاشی و کالا؛ ETA برآورد.

**9. اعتبارسنجی:** روش قابل سرویس مقصد؛ هیچ هزینه دوباره بسته‌بندی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: quote loading CTA disabled؛ no method تماس/تغییر آدرس؛ هزینه تغییرکرده تأیید.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: radio cards عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** weight، packages، methods، shipping quote/version، delivery groups؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** هزینه محصول/بسته‌بندی سفارش/حمل جدا؛ تحویل چندقلم روشن؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-12 — checkout: روش ارسال / Delivery Method
نقش و دسترسی: مهمان و مشتری
هدف: انتخاب حمل و آگاهی از تحویل جداگانه
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout/delivery. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: مقصد؛ radio روش‌ها با هزینه/بازه؛ مرسوله‌ها؛ اقلام دیجیتال؛ خلاصه total.
کامپوننت‌ها و CTA: اجزای اختصاصی: مقصد؛ radio روش‌ها با هزینه/بازه؛ مرسوله‌ها؛ اقلام دیجیتال؛ خلاصه total. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: روش ارسال / Delivery method؛ زمان تقریبی / Estimated delivery؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: تغییر روش/مقصد recalculation؛ تفکیک زمان نقاشی و کالا؛ ETA برآورد.
اعتبارسنجی: روش قابل سرویس مقصد؛ هیچ هزینه دوباره بسته‌بندی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: quote loading CTA disabled؛ no method تماس/تغییر آدرس؛ هزینه تغییرکرده تأیید.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: radio cards عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: weight، packages، methods، shipping quote/version، delivery groups؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: هزینه محصول/بسته‌بندی سفارش/حمل جدا؛ تحویل چندقلم روشن؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-13"></a>

### PUB-13 — checkout: پرداخت / Payment

**1. نام و شناسه:** PUB-13 — checkout: پرداخت / Payment

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** تأیید مبلغ و شروع پرداخت

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout/payment`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** invoice خلاصه؛ آدرس/حمل؛ تخفیف و اقلام مستثنا؛ روش درگاه؛ شرایط؛ مبلغ دکمه.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: invoice خلاصه؛ آدرس/حمل؛ تخفیف و اقلام مستثنا؛ روش درگاه؛ شرایط؛ مبلغ دکمه. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پرداخت … تومان / Pay … toman؛ مجموع قابل پرداخت / Total due؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** submit واحد loading؛ شروع پرداخت رزرو و redirect؛ تغییر قیمت به review؛ روش mask.

**9. اعتبارسنجی:** مبلغ یکسان invoice/gateway؛ checkbox الزامی طبق policy؛ رزرو همه اجزای پکیج هماهنگ؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: رزرو ناکافی به cart؛ session expired؛ خطای آغاز پرداخت retry امن.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: خلاصه قابل بازشدن و CTA ثابت؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** checkout version، final totals، payment methods، reservation status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-05/08: submit دوباره سفارش مضاعف نسازد؛ کد/موجودی را دوباره بررسی؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-13 — checkout: پرداخت / Payment
نقش و دسترسی: مهمان و مشتری
هدف: تأیید مبلغ و شروع پرداخت
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout/payment. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: invoice خلاصه؛ آدرس/حمل؛ تخفیف و اقلام مستثنا؛ روش درگاه؛ شرایط؛ مبلغ دکمه.
کامپوننت‌ها و CTA: اجزای اختصاصی: invoice خلاصه؛ آدرس/حمل؛ تخفیف و اقلام مستثنا؛ روش درگاه؛ شرایط؛ مبلغ دکمه. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پرداخت … تومان / Pay … toman؛ مجموع قابل پرداخت / Total due؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: submit واحد loading؛ شروع پرداخت رزرو و redirect؛ تغییر قیمت به review؛ روش mask.
اعتبارسنجی: مبلغ یکسان invoice/gateway؛ checkbox الزامی طبق policy؛ رزرو همه اجزای پکیج هماهنگ؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: رزرو ناکافی به cart؛ session expired؛ خطای آغاز پرداخت retry امن.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: خلاصه قابل بازشدن و CTA ثابت؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: checkout version، final totals، payment methods، reservation status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-05/08: submit دوباره سفارش مضاعف نسازد؛ کد/موجودی را دوباره بررسی؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-14"></a>

### PUB-14 — وضعیت نامشخص پرداخت / Payment Verification

**1. نام و شناسه:** PUB-14 — وضعیت نامشخص پرداخت / Payment Verification

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** جلوگیری از پرداخت دوباره هنگام بررسی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout/verifying/:attempt`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** icon pending؛ شماره تلاش؛ مبلغ؛ توضیح؛ refresh امن؛ پشتیبانی.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: icon pending؛ شماره تلاش؛ مبلغ؛ توضیح؛ refresh امن؛ پشتیبانی. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** در حال بررسی تراکنش / Checking your transaction؛ دوباره پرداخت نکنید / Please do not pay again yet؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** poll وضعیت با interval سرویس؛ نتیجه به success/failed؛ «دوباره پرداخت» تا معلوم شدن غیرفعال.

**9. اعتبارسنجی:** callback وضعیت قطعی نیست؛ ناشناخته را شکست اعلام نکند؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بررسی طولانی با مرجع پیگیری؛ رزرو انقضا/پرداخت دیرهنگام بدون وعده ارسال.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: panel مرکزی بدون گراف سنگین؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** attempt reference، confirmed status، amount، resolution؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-09: کمبود پس از پرداخت با «در حال رسیدگی» نه موفقیت ارسال؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-14 — وضعیت نامشخص پرداخت / Payment Verification
نقش و دسترسی: مهمان و مشتری
هدف: جلوگیری از پرداخت دوباره هنگام بررسی
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout/verifying/:attempt. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: icon pending؛ شماره تلاش؛ مبلغ؛ توضیح؛ refresh امن؛ پشتیبانی.
کامپوننت‌ها و CTA: اجزای اختصاصی: icon pending؛ شماره تلاش؛ مبلغ؛ توضیح؛ refresh امن؛ پشتیبانی. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: در حال بررسی تراکنش / Checking your transaction؛ دوباره پرداخت نکنید / Please do not pay again yet؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: poll وضعیت با interval سرویس؛ نتیجه به success/failed؛ «دوباره پرداخت» تا معلوم شدن غیرفعال.
اعتبارسنجی: callback وضعیت قطعی نیست؛ ناشناخته را شکست اعلام نکند؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بررسی طولانی با مرجع پیگیری؛ رزرو انقضا/پرداخت دیرهنگام بدون وعده ارسال.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: panel مرکزی بدون گراف سنگین؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: attempt reference، confirmed status، amount، resolution؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-09: کمبود پس از پرداخت با «در حال رسیدگی» نه موفقیت ارسال؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-15"></a>

### PUB-15 — پرداخت موفق / Payment Success

**1. نام و شناسه:** PUB-15 — پرداخت موفق / Payment Success

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** رسید و گام بعدی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout/success/:order`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** تأیید؛ شماره سفارش/مبلغ؛ اقلام/پکیج؛ پرداخت؛ مرسوله/نقاشی؛ track و receipt.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: تأیید؛ شماره سفارش/مبلغ؛ اقلام/پکیج؛ پرداخت؛ مرسوله/نقاشی؛ track و receipt. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پرداخت تأیید شد / Payment confirmed؛ پیگیری سفارش / Track order؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** نمایش فقط پس از verification؛ download اگر آماده؛ ادامه خرید.

**9. اعتبارسنجی:** اطلاعات تنها برای صاحب سفارش؛ موفقیت پرداخت مساوی تکمیل تولید نیست؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: رسید loading؛ فایل هنوز آماده نیست؛ بدون سفارش به support.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: CTAها تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** confirmed order، paid amount، next actions، shipments؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** مبلغ با رسید برابر؛ مراحل متفاوت اقلام نشان داده شود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-15 — پرداخت موفق / Payment Success
نقش و دسترسی: مهمان و مشتری
هدف: رسید و گام بعدی
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout/success/:order. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: تأیید؛ شماره سفارش/مبلغ؛ اقلام/پکیج؛ پرداخت؛ مرسوله/نقاشی؛ track و receipt.
کامپوننت‌ها و CTA: اجزای اختصاصی: تأیید؛ شماره سفارش/مبلغ؛ اقلام/پکیج؛ پرداخت؛ مرسوله/نقاشی؛ track و receipt. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پرداخت تأیید شد / Payment confirmed؛ پیگیری سفارش / Track order؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: نمایش فقط پس از verification؛ download اگر آماده؛ ادامه خرید.
اعتبارسنجی: اطلاعات تنها برای صاحب سفارش؛ موفقیت پرداخت مساوی تکمیل تولید نیست؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: رسید loading؛ فایل هنوز آماده نیست؛ بدون سفارش به support.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: CTAها تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: confirmed order، paid amount، next actions، shipments؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: مبلغ با رسید برابر؛ مراحل متفاوت اقلام نشان داده شود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-16"></a>

### PUB-16 — پرداخت ناموفق یا لغوشده / Payment Recovery

**1. نام و شناسه:** PUB-16 — پرداخت ناموفق یا لغوشده / Payment Recovery

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** بازیابی خرید با وضعیت مالی روشن

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/checkout/failed/:attempt`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** علت ساده؛ مرجع؛ مبلغ؛ retry/change method؛ cart/support.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: علت ساده؛ مرجع؛ مبلغ؛ retry/change method؛ cart/support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پرداخت کامل نشد / Payment wasn't completed؛ تلاش دوباره / Try again؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** فقط شکست قطعی retry؛ بررسی قیمت/stock قبل تلاش تازه؛ کد مصرف نشود.

**9. اعتبارسنجی:** وضعیت unknown به verifying؛ ادعای «برداشت نشده» فقط با داده معتبر؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: failed/cancelled/timeout تفکیک؛ سبد حفظ.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: پنل ساده مرکزی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** attempt status، safe retry flag، cart؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-08: رزرو شکست آزاد؛ retry موجودی تازه بررسی؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-16 — پرداخت ناموفق یا لغوشده / Payment Recovery
نقش و دسترسی: مهمان و مشتری
هدف: بازیابی خرید با وضعیت مالی روشن
مسیر و ورود/خروج: مسیر پیشنهادی: /checkout/failed/:attempt. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: علت ساده؛ مرجع؛ مبلغ؛ retry/change method؛ cart/support.
کامپوننت‌ها و CTA: اجزای اختصاصی: علت ساده؛ مرجع؛ مبلغ؛ retry/change method؛ cart/support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پرداخت کامل نشد / Payment wasn't completed؛ تلاش دوباره / Try again؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: فقط شکست قطعی retry؛ بررسی قیمت/stock قبل تلاش تازه؛ کد مصرف نشود.
اعتبارسنجی: وضعیت unknown به verifying؛ ادعای «برداشت نشده» فقط با داده معتبر؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: failed/cancelled/timeout تفکیک؛ سبد حفظ.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: پنل ساده مرکزی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: attempt status، safe retry flag، cart؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-08: رزرو شکست آزاد؛ retry موجودی تازه بررسی؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-17"></a>

### PUB-17 — پیگیری مهمان / Guest Tracking

**1. نام و شناسه:** PUB-17 — پیگیری مهمان / Guest Tracking

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** دسترسی امن به سفارش بدون پنل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/track-order`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** شماره سفارش؛ تلفن؛ ارسال OTP؛ پس از تأیید خلاصه/timeline/رهگیری.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: شماره سفارش؛ تلفن؛ ارسال OTP؛ پس از تأیید خلاصه/timeline/رهگیری. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پیگیری سفارش / Track your order؛ تأیید شماره / Verify phone؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** جست‌وجو با تلفن تنها داده خصوصی را آشکار نکند؛ OTP برای دسترسی؛ لینک پنل.

**9. اعتبارسنجی:** کد/تلفن معتبر؛ پاسخ عمومی برای نبود/عدم تطابق؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no-match عمومی؛ expired OTP؛ retry rate limited.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: فرم کوچک و timeline عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** lookup reference، OTP challenge، allowed order summary؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** نشانی/فایل قبل تأیید نشان داده نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-17 — پیگیری مهمان / Guest Tracking
نقش و دسترسی: مهمان و مشتری
هدف: دسترسی امن به سفارش بدون پنل
مسیر و ورود/خروج: مسیر پیشنهادی: /track-order. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: شماره سفارش؛ تلفن؛ ارسال OTP؛ پس از تأیید خلاصه/timeline/رهگیری.
کامپوننت‌ها و CTA: اجزای اختصاصی: شماره سفارش؛ تلفن؛ ارسال OTP؛ پس از تأیید خلاصه/timeline/رهگیری. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پیگیری سفارش / Track your order؛ تأیید شماره / Verify phone؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: جست‌وجو با تلفن تنها داده خصوصی را آشکار نکند؛ OTP برای دسترسی؛ لینک پنل.
اعتبارسنجی: کد/تلفن معتبر؛ پاسخ عمومی برای نبود/عدم تطابق؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no-match عمومی؛ expired OTP؛ retry rate limited.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: فرم کوچک و timeline عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: lookup reference، OTP challenge، allowed order summary؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: نشانی/فایل قبل تأیید نشان داده نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-18"></a>

### PUB-18 — درباره ما / About

**1. نام و شناسه:** PUB-18 — درباره ما / About

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** شناخت هنرمند و برند

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/about`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** hero؛ داستان؛ تصویر فرایند؛ ارزش‌ها؛ آثار؛ CTA تماس/نقاشی.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: hero؛ داستان؛ تصویر فرایند؛ ارزش‌ها؛ آثار؛ CTA تماس/نقاشی. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** درباره نیل‌آرت / About NilArt؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** لینک هنرمند و کالکشن؛ تصویر با caption.

**9. اعتبارسنجی:** ادعاها از محتوای تأییدشده؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: محتوا خالی CTA تماس؛ تصاویر fallback.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: ستون خوانا ۷۲۰px؛ تصویر قبل متن؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** published content، photos، artist biography؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** خوانایی متن و alt؛ مسیر بازگشت روشن؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-18 — درباره ما / About
نقش و دسترسی: مهمان و مشتری
هدف: شناخت هنرمند و برند
مسیر و ورود/خروج: مسیر پیشنهادی: /about. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: hero؛ داستان؛ تصویر فرایند؛ ارزش‌ها؛ آثار؛ CTA تماس/نقاشی.
کامپوننت‌ها و CTA: اجزای اختصاصی: hero؛ داستان؛ تصویر فرایند؛ ارزش‌ها؛ آثار؛ CTA تماس/نقاشی. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: درباره نیل‌آرت / About NilArt؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: لینک هنرمند و کالکشن؛ تصویر با caption.
اعتبارسنجی: ادعاها از محتوای تأییدشده؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: محتوا خالی CTA تماس؛ تصاویر fallback.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: ستون خوانا ۷۲۰px؛ تصویر قبل متن؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: published content، photos، artist biography؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: خوانایی متن و alt؛ مسیر بازگشت روشن؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-19"></a>

### PUB-19 — تماس / Contact

**1. نام و شناسه:** PUB-19 — تماس / Contact

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** ارتباط و ایجاد درخواست

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/contact`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** راه تماس تأییدشده؛ ساعت پاسخ؛ فرم موضوع/نام/تلفن/پیام؛ FAQ link.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: راه تماس تأییدشده؛ ساعت پاسخ؛ فرم موضوع/نام/تلفن/پیام؛ FAQ link. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** با ما در تماس باشید / Get in touch؛ پیام ارسال شد / Message sent؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** submit ticket reference؛ سفارش پس از احراز قابل اتصال.

**9. اعتبارسنجی:** required؛ attachment policy؛ spam protection؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: sent reference؛ error input preserved؛ بدون روش تماس ساختگی.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: فرم یک ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** contact settings، form، reference؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** راه تماس/ساعت از داده؛ duplicate submit قفل؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-19 — تماس / Contact
نقش و دسترسی: مهمان و مشتری
هدف: ارتباط و ایجاد درخواست
مسیر و ورود/خروج: مسیر پیشنهادی: /contact. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: راه تماس تأییدشده؛ ساعت پاسخ؛ فرم موضوع/نام/تلفن/پیام؛ FAQ link.
کامپوننت‌ها و CTA: اجزای اختصاصی: راه تماس تأییدشده؛ ساعت پاسخ؛ فرم موضوع/نام/تلفن/پیام؛ FAQ link. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: با ما در تماس باشید / Get in touch؛ پیام ارسال شد / Message sent؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: submit ticket reference؛ سفارش پس از احراز قابل اتصال.
اعتبارسنجی: required؛ attachment policy؛ spam protection؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: sent reference؛ error input preserved؛ بدون روش تماس ساختگی.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: فرم یک ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: contact settings، form، reference؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: راه تماس/ساعت از داده؛ duplicate submit قفل؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-20"></a>

### PUB-20 — سؤالات متداول / FAQ

**1. نام و شناسه:** PUB-20 — سؤالات متداول / FAQ

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** کاهش ابهام خرید

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/faq`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** search؛ دسته خرید/دفتر/ارسال/نقاشی/مرجوعی؛ accordion؛ support.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: search؛ دسته خرید/دفتر/ارسال/نقاشی/مرجوعی؛ accordion؛ support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سؤالات متداول / Frequently asked questions؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** یک/چند accordion قابل بازشدن؛ query حفظ.

**9. اعتبارسنجی:** فقط جواب منتشرشده؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no results به support؛ skeleton content.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: accordion تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** FAQ entries/categories؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** keyboard و aria-expanded درست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-20 — سؤالات متداول / FAQ
نقش و دسترسی: مهمان و مشتری
هدف: کاهش ابهام خرید
مسیر و ورود/خروج: مسیر پیشنهادی: /faq. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: search؛ دسته خرید/دفتر/ارسال/نقاشی/مرجوعی؛ accordion؛ support.
کامپوننت‌ها و CTA: اجزای اختصاصی: search؛ دسته خرید/دفتر/ارسال/نقاشی/مرجوعی؛ accordion؛ support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سؤالات متداول / Frequently asked questions؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: یک/چند accordion قابل بازشدن؛ query حفظ.
اعتبارسنجی: فقط جواب منتشرشده؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no results به support؛ skeleton content.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: accordion تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: FAQ entries/categories؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: keyboard و aria-expanded درست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-21"></a>

### PUB-21 — راهنمای انتخاب / Buying Guide

**1. نام و شناسه:** PUB-21 — راهنمای انتخاب / Buying Guide

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** فهم سایز، برگ، گرماژ و جلد

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/guides/:slug`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** جدول ابعاد A4/A5/A6؛ مقایسه کاربرد کاغذ؛ برگ/صفحه؛ جنس جلد؛ نمونه تصاویر؛ لینک محصول.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: جدول ابعاد A4/A5/A6؛ مقایسه کاربرد کاغذ؛ برگ/صفحه؛ جنس جلد؛ نمونه تصاویر؛ لینک محصول. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** راهنمای انتخاب دفتر / Notebook buying guide؛ برگ با صفحه متفاوت است / Sheets and pages are different؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** anchor navigation؛ مقایسه بدون مجبورکردن به خرید.

**9. اعتبارسنجی:** مشخصات مطابق کاتالوگ؛ مقادیر از منبع تأیید؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: guide missing لینک FAQ؛ media fallback.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: جدول تبدیل کارت؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** guides، dimension facts، related products؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** عدد گرماژ با تعداد برگ اشتباه نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-21 — راهنمای انتخاب / Buying Guide
نقش و دسترسی: مهمان و مشتری
هدف: فهم سایز، برگ، گرماژ و جلد
مسیر و ورود/خروج: مسیر پیشنهادی: /guides/:slug. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: جدول ابعاد A4/A5/A6؛ مقایسه کاربرد کاغذ؛ برگ/صفحه؛ جنس جلد؛ نمونه تصاویر؛ لینک محصول.
کامپوننت‌ها و CTA: اجزای اختصاصی: جدول ابعاد A4/A5/A6؛ مقایسه کاربرد کاغذ؛ برگ/صفحه؛ جنس جلد؛ نمونه تصاویر؛ لینک محصول. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: راهنمای انتخاب دفتر / Notebook buying guide؛ برگ با صفحه متفاوت است / Sheets and pages are different؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: anchor navigation؛ مقایسه بدون مجبورکردن به خرید.
اعتبارسنجی: مشخصات مطابق کاتالوگ؛ مقادیر از منبع تأیید؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: guide missing لینک FAQ؛ media fallback.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: جدول تبدیل کارت؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: guides، dimension facts، related products؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: عدد گرماژ با تعداد برگ اشتباه نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-22"></a>

### PUB-22 — قوانین خرید / Terms

**1. نام و شناسه:** PUB-22 — قوانین خرید / Terms

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** اطلاع قبل توافق

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/terms`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** عنوان؛ تاریخ نسخه؛ فهرست بخش‌ها؛ سفارش/پرداخت/اصلاحات؛ لینک مرجوعی/حریم.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: عنوان؛ تاریخ نسخه؛ فهرست بخش‌ها؛ سفارش/پرداخت/اصلاحات؛ لینک مرجوعی/حریم. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** شرایط خرید / Purchase terms؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** anchor و print؛ نمایش همان نسخه پذیرفته checkout.

**9. اعتبارسنجی:** متن ادمین تأییدشده؛ این سند متن حقوقی تولید نمی‌کند؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: نسخه unavailable retry؛ ترجمه مفقود label واضح.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: ستون خوانا؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** policy versions، effective date؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** هیچ شرط عددی ساخته نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-22 — قوانین خرید / Terms
نقش و دسترسی: مهمان و مشتری
هدف: اطلاع قبل توافق
مسیر و ورود/خروج: مسیر پیشنهادی: /terms. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: عنوان؛ تاریخ نسخه؛ فهرست بخش‌ها؛ سفارش/پرداخت/اصلاحات؛ لینک مرجوعی/حریم.
کامپوننت‌ها و CTA: اجزای اختصاصی: عنوان؛ تاریخ نسخه؛ فهرست بخش‌ها؛ سفارش/پرداخت/اصلاحات؛ لینک مرجوعی/حریم. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: شرایط خرید / Purchase terms؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: anchor و print؛ نمایش همان نسخه پذیرفته checkout.
اعتبارسنجی: متن ادمین تأییدشده؛ این سند متن حقوقی تولید نمی‌کند؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: نسخه unavailable retry؛ ترجمه مفقود label واضح.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: ستون خوانا؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: policy versions، effective date؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: هیچ شرط عددی ساخته نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-23"></a>

### PUB-23 — حریم خصوصی / Privacy

**1. نام و شناسه:** PUB-23 — حریم خصوصی / Privacy

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** آگاهی از داده و فایل‌ها

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/privacy`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** نسخه؛ داده تلفن/آدرس/عکس؛ کاربرد/نگهداری؛ حقوق و تماس.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: نسخه؛ داده تلفن/آدرس/عکس؛ کاربرد/نگهداری؛ حقوق و تماس. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** حریم خصوصی / Privacy policy؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** ناوبری و چاپ؛ لینک contact.

**9. اعتبارسنجی:** از متن مصوب کسب‌وکار؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing language توضیح؛ error retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: متن تک‌ستونه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** approved policy content؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** عکس‌های مرجع private توصیف شوند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-23 — حریم خصوصی / Privacy
نقش و دسترسی: مهمان و مشتری
هدف: آگاهی از داده و فایل‌ها
مسیر و ورود/خروج: مسیر پیشنهادی: /privacy. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: نسخه؛ داده تلفن/آدرس/عکس؛ کاربرد/نگهداری؛ حقوق و تماس.
کامپوننت‌ها و CTA: اجزای اختصاصی: نسخه؛ داده تلفن/آدرس/عکس؛ کاربرد/نگهداری؛ حقوق و تماس. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: حریم خصوصی / Privacy policy؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: ناوبری و چاپ؛ لینک contact.
اعتبارسنجی: از متن مصوب کسب‌وکار؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing language توضیح؛ error retry.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: متن تک‌ستونه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: approved policy content؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: عکس‌های مرجع private توصیف شوند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="pub-24"></a>

### PUB-24 — شرایط لغو و مرجوعی / Return Policy

**1. نام و شناسه:** PUB-24 — شرایط لغو و مرجوعی / Return Policy

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** فهم تفاوت کالای آماده، سفارشی و دیجیتال

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/returns-policy`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs نوع محصول؛ شرایط/مهلت از داده؛ هزینه ارسال برگشت؛ مراحل؛ لینک درخواست.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs نوع محصول؛ شرایط/مهلت از داده؛ هزینه ارسال برگشت؛ مراحل؛ لینک درخواست. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** لغو و مرجوعی / Cancellations and returns؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** انتخاب نوع مثال روشن؛ CTA به order selection.

**9. اعتبارسنجی:** policy زنده، بدون وعده مرجوعی همه کالاها؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: policy loading؛ no applicable rule تماس.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: tabs قابل scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** return policies by type؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** شرایط قبل خرید قابل دسترس؛ اصل/دیجیتال/سفارشی جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PUB-24 — شرایط لغو و مرجوعی / Return Policy
نقش و دسترسی: مهمان و مشتری
هدف: فهم تفاوت کالای آماده، سفارشی و دیجیتال
مسیر و ورود/خروج: مسیر پیشنهادی: /returns-policy. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs نوع محصول؛ شرایط/مهلت از داده؛ هزینه ارسال برگشت؛ مراحل؛ لینک درخواست.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs نوع محصول؛ شرایط/مهلت از داده؛ هزینه ارسال برگشت؛ مراحل؛ لینک درخواست. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: لغو و مرجوعی / Cancellations and returns؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: انتخاب نوع مثال روشن؛ CTA به order selection.
اعتبارسنجی: policy زنده، بدون وعده مرجوعی همه کالاها؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: policy loading؛ no applicable rule تماس.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: tabs قابل scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: return policies by type؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: شرایط قبل خرید قابل دسترس؛ اصل/دیجیتال/سفارشی جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۵. فروش و سفارش نقاشی

<a id="paint-01"></a>

### PAINT-01 — گالری نقاشی / Art Gallery

**1. نام و شناسه:** PAINT-01 — گالری نقاشی / Art Gallery

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** خرید اثر آماده یا شروع سفارش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artworks`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** hero؛ فیلتر هنرمند/سبک/تکنیک/ابعاد/اصل یا نسخه؛ grid؛ commissioned CTA.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: hero؛ فیلتر هنرمند/سبک/تکنیک/ابعاد/اصل یا نسخه؛ grid؛ commissioned CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** گالری نقاشی / Art gallery؛ اصل اثر / Original artwork؛ نسخه چاپی / Art print؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** کارت اصل و چاپ label جدا؛ خرید اثر آماده به detail.

**9. اعتبارسنجی:** نسخه چاپی از موجودی اصل مستقل؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty/reset؛ sold badge؛ loading تصاویر.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: grid دو ستون موبایل؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** artworks، artist، edition، availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** اثر فروخته‌شده خریدپذیر نیست؛ سفارش سفارشی مسیر جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-01 — گالری نقاشی / Art Gallery
نقش و دسترسی: مهمان و مشتری
هدف: خرید اثر آماده یا شروع سفارش
مسیر و ورود/خروج: مسیر پیشنهادی: /artworks. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: hero؛ فیلتر هنرمند/سبک/تکنیک/ابعاد/اصل یا نسخه؛ grid؛ commissioned CTA.
کامپوننت‌ها و CTA: اجزای اختصاصی: hero؛ فیلتر هنرمند/سبک/تکنیک/ابعاد/اصل یا نسخه؛ grid؛ commissioned CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: گالری نقاشی / Art gallery؛ اصل اثر / Original artwork؛ نسخه چاپی / Art print؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: کارت اصل و چاپ label جدا؛ خرید اثر آماده به detail.
اعتبارسنجی: نسخه چاپی از موجودی اصل مستقل؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty/reset؛ sold badge؛ loading تصاویر.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: grid دو ستون موبایل؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: artworks، artist، edition، availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: اثر فروخته‌شده خریدپذیر نیست؛ سفارش سفارشی مسیر جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="paint-02"></a>

### PAINT-02 — جزئیات نقاشی آماده / Artwork Detail

**1. نام و شناسه:** PAINT-02 — جزئیات نقاشی آماده / Artwork Detail

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** تصمیم خرید اصل یا خروجی موجود

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artworks/:slug`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** گالری zoom؛ هنرمند/تکنیک/ابعاد/اصالت؛ قیمت؛ موجودی محدود؛ تحویل/مرجوعی؛ CTA.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: گالری zoom؛ هنرمند/تکنیک/ابعاد/اصالت؛ قیمت؛ موجودی محدود؛ تحویل/مرجوعی؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اثر اصیل / Original art؛ مشخصات اثر / Artwork details؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** اصل یکتا رزرو مانند SKU؛ چاپ مرتبط به محصول مستقل؛ favorite/share.

**9. اعتبارسنجی:** نوع اصل/چاپ/دیجیتال واضح؛ فایل چاپ عمومی نباشد؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: sold out؛ unavailable؛ certificate loading.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: گالری بالا CTA پایین؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** artwork، certificate summary، SKU، delivery/license؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** اصالت قابل نمایش بدون افشای فایل؛ شرط تحویل روشن؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-02 — جزئیات نقاشی آماده / Artwork Detail
نقش و دسترسی: مهمان و مشتری
هدف: تصمیم خرید اصل یا خروجی موجود
مسیر و ورود/خروج: مسیر پیشنهادی: /artworks/:slug. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: گالری zoom؛ هنرمند/تکنیک/ابعاد/اصالت؛ قیمت؛ موجودی محدود؛ تحویل/مرجوعی؛ CTA.
کامپوننت‌ها و CTA: اجزای اختصاصی: گالری zoom؛ هنرمند/تکنیک/ابعاد/اصالت؛ قیمت؛ موجودی محدود؛ تحویل/مرجوعی؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اثر اصیل / Original art؛ مشخصات اثر / Artwork details؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: اصل یکتا رزرو مانند SKU؛ چاپ مرتبط به محصول مستقل؛ favorite/share.
اعتبارسنجی: نوع اصل/چاپ/دیجیتال واضح؛ فایل چاپ عمومی نباشد؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: sold out؛ unavailable؛ certificate loading.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: گالری بالا CTA پایین؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: artwork، certificate summary، SKU، delivery/license؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: اصالت قابل نمایش بدون افشای فایل؛ شرط تحویل روشن؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="paint-03"></a>

### PAINT-03 — شروع سفارش نقاشی / Commission Start

**1. نام و شناسه:** PAINT-03 — شروع سفارش نقاشی / Commission Start

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** انتخاب عکس یا ایده و ساخت پیش‌نویس

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/commissions/new`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** معرفی مراحل؛ گزینه عکس/ایده؛ نمونه سبک؛ زمان تخمینی؛ CTA.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: معرفی مراحل؛ گزینه عکس/ایده؛ نمونه سبک؛ زمان تخمینی؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نقاشی مخصوص شما / Art made for you؛ از عکس / From a photo؛ از ایده / From an idea؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** شروع draft؛ ادامه draft قبلی؛ auth مقصد حفظ.

**9. اعتبارسنجی:** قیمت نهایی بعد quote، نه ادعای رایگان/قطعی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no draft شروع؛ service unavailable support.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: radio cards تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** draft، available styles، service status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** نقاشی سفارشی از کالای آماده تفکیک؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-03 — شروع سفارش نقاشی / Commission Start
نقش و دسترسی: مهمان و مشتری
هدف: انتخاب عکس یا ایده و ساخت پیش‌نویس
مسیر و ورود/خروج: مسیر پیشنهادی: /commissions/new. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: معرفی مراحل؛ گزینه عکس/ایده؛ نمونه سبک؛ زمان تخمینی؛ CTA.
کامپوننت‌ها و CTA: اجزای اختصاصی: معرفی مراحل؛ گزینه عکس/ایده؛ نمونه سبک؛ زمان تخمینی؛ CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نقاشی مخصوص شما / Art made for you؛ از عکس / From a photo؛ از ایده / From an idea؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: شروع draft؛ ادامه draft قبلی؛ auth مقصد حفظ.
اعتبارسنجی: قیمت نهایی بعد quote، نه ادعای رایگان/قطعی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no draft شروع؛ service unavailable support.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: radio cards تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: draft، available styles، service status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: نقاشی سفارشی از کالای آماده تفکیک؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="paint-04"></a>

### PAINT-04 — عکس و توضیحات / References & Brief

**1. نام و شناسه:** PAINT-04 — عکس و توضیحات / References & Brief

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** ثبت مرجع و خواسته

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/commissions/:draft/brief`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** stepper؛ uploader چندفایل؛ previews/reorder/remove؛ prompt؛ quality/privacy؛ save/next.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: stepper؛ uploader چندفایل؛ previews/reorder/remove؛ prompt؛ quality/privacy؛ save/next. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** عکس‌های مرجع / Reference images؛ چه تغییری می‌خواهید؟ / What would you like changed?؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** upload progress per file؛ مسیر ایده بدون عکس؛ autosave؛ back حفظ.

**9. اعتبارسنجی:** فرمت/حجم طبق config؛ brief مسیر ایده الزامی؛ file quality warning؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: partial upload retry؛ unsafe/unsupported؛ offline draft حفظ.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: camera/file picker؛ input تک‌ستونه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** files/status، prompt، mode، limits، draft save state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** عکس private؛ همه فایل‌های موفق با retry از بین نروند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-04 — عکس و توضیحات / References & Brief
نقش و دسترسی: مهمان و مشتری
هدف: ثبت مرجع و خواسته
مسیر و ورود/خروج: مسیر پیشنهادی: /commissions/:draft/brief. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: stepper؛ uploader چندفایل؛ previews/reorder/remove؛ prompt؛ quality/privacy؛ save/next.
کامپوننت‌ها و CTA: اجزای اختصاصی: stepper؛ uploader چندفایل؛ previews/reorder/remove؛ prompt؛ quality/privacy؛ save/next. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: عکس‌های مرجع / Reference images؛ چه تغییری می‌خواهید؟ / What would you like changed?؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: upload progress per file؛ مسیر ایده بدون عکس؛ autosave؛ back حفظ.
اعتبارسنجی: فرمت/حجم طبق config؛ brief مسیر ایده الزامی؛ file quality warning؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: partial upload retry؛ unsafe/unsupported؛ offline draft حفظ.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: camera/file picker؛ input تک‌ستونه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: files/status، prompt، mode، limits، draft save state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: عکس private؛ همه فایل‌های موفق با retry از بین نروند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="paint-05"></a>

### PAINT-05 — سبک، سایز و اجرا / Style & Execution

**1. نام و شناسه:** PAINT-05 — سبک، سایز و اجرا / Style & Execution

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** تعیین خروجی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/commissions/:draft/options`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** style radio previews؛ size؛ digital/hand-painted؛ material/time؛ توافق اصلاحات.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: style radio previews؛ size؛ digital/hand-painted؛ material/time؛ توافق اصلاحات. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سبک / Style؛ اجرای دستی / Hand-painted؛ فایل دیجیتال / Digital file؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** با انتخاب دستی اطلاعات زمان/ارسال؛ دیجیتال license.

**9. اعتبارسنجی:** گزینه فعال اجباری؛ شرایط اصلاح از config؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: style assets missing fallback؛ unsupported combination.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: cards در یک ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** styles، sizes، execution compatibility، revision policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** آدرس دیجیتال اجباری نشود؛ تعداد اصلاح فرضی ندارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-05 — سبک، سایز و اجرا / Style & Execution
نقش و دسترسی: مهمان و مشتری
هدف: تعیین خروجی
مسیر و ورود/خروج: مسیر پیشنهادی: /commissions/:draft/options. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: style radio previews؛ size؛ digital/hand-painted؛ material/time؛ توافق اصلاحات.
کامپوننت‌ها و CTA: اجزای اختصاصی: style radio previews؛ size؛ digital/hand-painted؛ material/time؛ توافق اصلاحات. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سبک / Style؛ اجرای دستی / Hand-painted؛ فایل دیجیتال / Digital file؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: با انتخاب دستی اطلاعات زمان/ارسال؛ دیجیتال license.
اعتبارسنجی: گزینه فعال اجباری؛ شرایط اصلاح از config؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: style assets missing fallback؛ unsupported combination.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: cards در یک ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: styles، sizes، execution compatibility، revision policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: آدرس دیجیتال اجباری نشود؛ تعداد اصلاح فرضی ندارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="paint-06"></a>

### PAINT-06 — تحلیل AI / AI Analysis

**1. نام و شناسه:** PAINT-06 — تحلیل AI / AI Analysis

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** نمایش پردازش و recovery

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/commissions/:draft/analysis`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** thumb؛ stage کیفیت/عناصر/سختی؛ متن بدون پرداخت؛ retry/human review.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: thumb؛ stage کیفیت/عناصر/سختی؛ متن بدون پرداخت؛ retry/human review. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** در حال بررسی تصویر / Analyzing your image؛ هنوز پرداختی انجام نشده / No payment has been made؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** queue→processing→complete؛ slow processing پیام؛ cancellation فقط مجاز.

**9. اعتبارسنجی:** D در بازه ۱–۳؛ confidence سرویس، نه progress ساختگی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: timeout؛ failed؛ human review لازم؛ empty reference بازگشت.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: panel مرکزی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** job state، detected factors، warnings؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** پیشرفت واقعی یا indeterminate؛ AI شکست‌خورده قیمت قطعی نسازد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-06 — تحلیل AI / AI Analysis
نقش و دسترسی: مهمان و مشتری
هدف: نمایش پردازش و recovery
مسیر و ورود/خروج: مسیر پیشنهادی: /commissions/:draft/analysis. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: thumb؛ stage کیفیت/عناصر/سختی؛ متن بدون پرداخت؛ retry/human review.
کامپوننت‌ها و CTA: اجزای اختصاصی: thumb؛ stage کیفیت/عناصر/سختی؛ متن بدون پرداخت؛ retry/human review. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: در حال بررسی تصویر / Analyzing your image؛ هنوز پرداختی انجام نشده / No payment has been made؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: queue→processing→complete؛ slow processing پیام؛ cancellation فقط مجاز.
اعتبارسنجی: D در بازه ۱–۳؛ confidence سرویس، نه progress ساختگی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: timeout؛ failed؛ human review لازم؛ empty reference بازگشت.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: panel مرکزی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: job state، detected factors، warnings؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: پیشرفت واقعی یا indeterminate؛ AI شکست‌خورده قیمت قطعی نسازد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="paint-07"></a>

### PAINT-07 — قیمت و بررسی هنرمند / Commission Quote

**1. نام و شناسه:** PAINT-07 — قیمت و بررسی هنرمند / Commission Quote

**2. نقش و دسترسی:** مهمان و مشتری

**3. هدف:** فهم قیمت و تأیید سفارش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/commissions/:draft/quote`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** مرجع/گزینه؛ D و دلایل؛ قیمت پایه/پیچیدگی/اجرا؛ تخفیف/ارسال در checkout؛ total؛ status review؛ edit/submit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: مرجع/گزینه؛ D و دلایل؛ قیمت پایه/پیچیدگی/اجرا؛ تخفیف/ارسال در checkout؛ total؛ status review؛ edit/submit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** قیمت پیشنهادی اثر / Artwork quote؛ در انتظار بررسی هنرمند / Awaiting artist review؛ تأیید قیمت / Accept quote؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** quote نهایی به cart؛ pending review ثبت درخواست؛ تغییر قیمت بعد review تأیید مشتری؛ expired recalc.

**9. اعتبارسنجی:** D معتبر؛ delta درصد فقط واقعی؛ pending غیرقابل پرداخت؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: recalculating؛ incomplete؛ awaiting artist؛ revised quote.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: breakdown زیر تصویر CTA وضعیت‌محور؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** quote version، factor، explanations، breakdown، review state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-19: تا review پرداخت نکند؛ فرمول دفتر را به نقاشی تعمیم ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: PAINT-07 — قیمت و بررسی هنرمند / Commission Quote
نقش و دسترسی: مهمان و مشتری
هدف: فهم قیمت و تأیید سفارش
مسیر و ورود/خروج: مسیر پیشنهادی: /commissions/:draft/quote. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: مرجع/گزینه؛ D و دلایل؛ قیمت پایه/پیچیدگی/اجرا؛ تخفیف/ارسال در checkout؛ total؛ status review؛ edit/submit.
کامپوننت‌ها و CTA: اجزای اختصاصی: مرجع/گزینه؛ D و دلایل؛ قیمت پایه/پیچیدگی/اجرا؛ تخفیف/ارسال در checkout؛ total؛ status review؛ edit/submit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: قیمت پیشنهادی اثر / Artwork quote؛ در انتظار بررسی هنرمند / Awaiting artist review؛ تأیید قیمت / Accept quote؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: quote نهایی به cart؛ pending review ثبت درخواست؛ تغییر قیمت بعد review تأیید مشتری؛ expired recalc.
اعتبارسنجی: D معتبر؛ delta درصد فقط واقعی؛ pending غیرقابل پرداخت؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: recalculating؛ incomplete؛ awaiting artist؛ revised quote.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: breakdown زیر تصویر CTA وضعیت‌محور؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: quote version، factor، explanations، breakdown، review state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-19: تا review پرداخت نکند؛ فرمول دفتر را به نقاشی تعمیم ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۶. ورود و ثبت‌نام

<a id="auth-01"></a>

### AUTH-01 — انتخاب روش ورود / Sign-in Method

**1. نام و شناسه:** AUTH-01 — انتخاب روش ورود / Sign-in Method

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** انتخاب رمز یا OTP

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** logo؛ زمینه هنری آرام؛ دو کارت روش؛ register؛ return مقصد.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: logo؛ زمینه هنری آرام؛ دو کارت روش؛ register؛ return مقصد. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ورود با رمز / Sign in with password؛ ورود با کد / Sign in with a code؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** با انتخاب روش phone حفظ؛ checkout context؛ switch language.

**9. اعتبارسنجی:** روش مجاز سرویس؛ بدون ورود شبکه اجتماعی فرضی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: method unavailable با جایگزین؛ session context.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: card مرکزی ۴۴۰px و موبایل تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** return URL مجاز، auth options؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** دو روش واقعاً جدا و قابل تغییر؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-01 — انتخاب روش ورود / Sign-in Method
نقش و دسترسی: مهمان یا صاحب حساب
هدف: انتخاب رمز یا OTP
مسیر و ورود/خروج: مسیر پیشنهادی: /auth. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: logo؛ زمینه هنری آرام؛ دو کارت روش؛ register؛ return مقصد.
کامپوننت‌ها و CTA: اجزای اختصاصی: logo؛ زمینه هنری آرام؛ دو کارت روش؛ register؛ return مقصد. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ورود با رمز / Sign in with password؛ ورود با کد / Sign in with a code؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: با انتخاب روش phone حفظ؛ checkout context؛ switch language.
اعتبارسنجی: روش مجاز سرویس؛ بدون ورود شبکه اجتماعی فرضی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: method unavailable با جایگزین؛ session context.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: card مرکزی ۴۴۰px و موبایل تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: return URL مجاز، auth options؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: دو روش واقعاً جدا و قابل تغییر؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-02"></a>

### AUTH-02 — ورود با رمز / Password Login

**1. نام و شناسه:** AUTH-02 — ورود با رمز / Password Login

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** ورود تلفن/رمز

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/password`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** phone/country؛ password/show؛ submit؛ forgot؛ OTP/register.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: phone/country؛ password/show؛ submit؛ forgot؛ OTP/register. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** شماره تلفن / Phone number؛ رمز عبور / Password؛ ورود / Sign in؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** submit loading؛ خطا focus؛ redirect فقط مقصد داخلی مجاز.

**9. اعتبارسنجی:** phone normalized؛ password required؛ auto-complete؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: credentials invalid عمومی؛ rate limit؛ locked؛ offline.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: فرم تک‌ستونه keyboard مناسب؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** phone، credential response، redirect؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** رمز در toast/log نمایش نشود؛ سبد حفظ؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-02 — ورود با رمز / Password Login
نقش و دسترسی: مهمان یا صاحب حساب
هدف: ورود تلفن/رمز
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/password. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: phone/country؛ password/show؛ submit؛ forgot؛ OTP/register.
کامپوننت‌ها و CTA: اجزای اختصاصی: phone/country؛ password/show؛ submit؛ forgot؛ OTP/register. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: شماره تلفن / Phone number؛ رمز عبور / Password؛ ورود / Sign in؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: submit loading؛ خطا focus؛ redirect فقط مقصد داخلی مجاز.
اعتبارسنجی: phone normalized؛ password required؛ auto-complete؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: credentials invalid عمومی؛ rate limit؛ locked؛ offline.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: فرم تک‌ستونه keyboard مناسب؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: phone، credential response، redirect؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: رمز در toast/log نمایش نشود؛ سبد حفظ؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-03"></a>

### AUTH-03 — تلفن ورود OTP / OTP Phone

**1. نام و شناسه:** AUTH-03 — تلفن ورود OTP / OTP Phone

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** درخواست کد ورود

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/otp`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** phone/country؛ helper؛ send code؛ password/register.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: phone/country؛ helper؛ send code؛ password/register. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ارسال کد ورود / Send sign-in code؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** challenge تازه؛ تغییر روش حفظ شماره.

**9. اعتبارسنجی:** شماره معتبر؛ rate limit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: SMS unavailable؛ no input؛ challenge sent.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: input tel LTR؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** phone، challenge limits؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** ورود رمز همچنان در دسترس؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-03 — تلفن ورود OTP / OTP Phone
نقش و دسترسی: مهمان یا صاحب حساب
هدف: درخواست کد ورود
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/otp. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: phone/country؛ helper؛ send code؛ password/register.
کامپوننت‌ها و CTA: اجزای اختصاصی: phone/country؛ helper؛ send code؛ password/register. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ارسال کد ورود / Send sign-in code؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: challenge تازه؛ تغییر روش حفظ شماره.
اعتبارسنجی: شماره معتبر؛ rate limit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: SMS unavailable؛ no input؛ challenge sent.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: input tel LTR؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: phone، challenge limits؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: ورود رمز همچنان در دسترس؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-04"></a>

### AUTH-04 — تلفن ثبت‌نام / Register Phone

**1. نام و شناسه:** AUTH-04 — تلفن ثبت‌نام / Register Phone

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** شروع ثبت‌نام

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/register`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** step ۱ از ۳؛ phone/country؛ terms checkbox/link؛ ارسال کد؛ existing account.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: step ۱ از ۳؛ phone/country؛ terms checkbox/link؛ ارسال کد؛ existing account. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ساخت حساب / Create account؛ ادامه / Continue؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** تأیید شماره قبل password؛ مقصد حفظ.

**9. اعتبارسنجی:** شماره معتبر؛ پذیرش terms version؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: existing account به login بدون افشای ناامن؛ sending failed.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: یک ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** phone، consent version، challenge؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** register flow شماره→OTP→رمز؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-04 — تلفن ثبت‌نام / Register Phone
نقش و دسترسی: مهمان یا صاحب حساب
هدف: شروع ثبت‌نام
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/register. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: step ۱ از ۳؛ phone/country؛ terms checkbox/link؛ ارسال کد؛ existing account.
کامپوننت‌ها و CTA: اجزای اختصاصی: step ۱ از ۳؛ phone/country؛ terms checkbox/link؛ ارسال کد؛ existing account. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ساخت حساب / Create account؛ ادامه / Continue؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: تأیید شماره قبل password؛ مقصد حفظ.
اعتبارسنجی: شماره معتبر؛ پذیرش terms version؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: existing account به login بدون افشای ناامن؛ sending failed.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: یک ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: phone، consent version، challenge؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: register flow شماره→OTP→رمز؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-05"></a>

### AUTH-05 — تأیید OTP / Verify Code

**1. نام و شناسه:** AUTH-05 — تأیید OTP / Verify Code

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** تأیید کد برای ورود/ثبت‌نام/بازیابی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/verify`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** heading context؛ masked phone؛ یک input کد؛ timer/resend؛ change phone.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: heading context؛ masked phone؛ یک input کد؛ timer/resend؛ change phone. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تأیید کد / Verify code؛ ارسال مجدد / Resend code؛ کد منقضی شده / Code expired؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** paste/autofill؛ ارسال مجدد فقط پس cooldown؛ موفقیت مقصد متناسب context.

**9. اعتبارسنجی:** طول کد از سرویس؛ انقضا/تلاش از سرویس؛ OTP همیشه LTR؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: wrong/expired؛ resend rate limit؛ send failure؛ verified.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: کد یک field با فاصله بصری؛ screen reader label؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** challenge purpose، masked number، code length، retryAfter؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** کد کامل قابل paste؛ انقضا زمان واقعی؛ context اشتباه باعث ثبت‌نام نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-05 — تأیید OTP / Verify Code
نقش و دسترسی: مهمان یا صاحب حساب
هدف: تأیید کد برای ورود/ثبت‌نام/بازیابی
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/verify. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: heading context؛ masked phone؛ یک input کد؛ timer/resend؛ change phone.
کامپوننت‌ها و CTA: اجزای اختصاصی: heading context؛ masked phone؛ یک input کد؛ timer/resend؛ change phone. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تأیید کد / Verify code؛ ارسال مجدد / Resend code؛ کد منقضی شده / Code expired؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: paste/autofill؛ ارسال مجدد فقط پس cooldown؛ موفقیت مقصد متناسب context.
اعتبارسنجی: طول کد از سرویس؛ انقضا/تلاش از سرویس؛ OTP همیشه LTR؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: wrong/expired؛ resend rate limit؛ send failure؛ verified.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: کد یک field با فاصله بصری؛ screen reader label؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: challenge purpose، masked number، code length، retryAfter؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: کد کامل قابل paste؛ انقضا زمان واقعی؛ context اشتباه باعث ثبت‌نام نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-06"></a>

### AUTH-06 — ساخت رمز ثبت‌نام / Create Password

**1. نام و شناسه:** AUTH-06 — ساخت رمز ثبت‌نام / Create Password

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** تکمیل ثبت‌نام

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/register/password`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** step ۳؛ password/confirm/show؛ rules؛ strength؛ complete.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: step ۳؛ password/confirm/show؛ rules؛ strength؛ complete. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ساخت رمز عبور / Create a password؛ تکرار رمز / Confirm password؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** قواعد live؛ تکمیل و profile optional؛ redirect checkout.

**9. اعتبارسنجی:** policy سرویس؛ match؛ challenge verified؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: challenge expired به verify؛ weak/mismatch؛ account created.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: input full-width؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** password policy، verified context؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** قواعد واقعی با پیام‌ها منطبق؛ password required؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-06 — ساخت رمز ثبت‌نام / Create Password
نقش و دسترسی: مهمان یا صاحب حساب
هدف: تکمیل ثبت‌نام
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/register/password. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: step ۳؛ password/confirm/show؛ rules؛ strength؛ complete.
کامپوننت‌ها و CTA: اجزای اختصاصی: step ۳؛ password/confirm/show؛ rules؛ strength؛ complete. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ساخت رمز عبور / Create a password؛ تکرار رمز / Confirm password؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: قواعد live؛ تکمیل و profile optional؛ redirect checkout.
اعتبارسنجی: policy سرویس؛ match؛ challenge verified؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: challenge expired به verify؛ weak/mismatch؛ account created.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: input full-width؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: password policy، verified context؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: قواعد واقعی با پیام‌ها منطبق؛ password required؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-07"></a>

### AUTH-07 — فراموشی رمز / Forgot Password

**1. نام و شناسه:** AUTH-07 — فراموشی رمز / Forgot Password

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** درخواست بازیابی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/forgot`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** phone؛ پیام عمومی؛ send؛ back login.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: phone؛ پیام عمومی؛ send؛ back login. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** بازیابی رمز / Reset your password؛ اگر حسابی باشد کد ارسال می‌شود / If an account exists, a code will be sent؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** verify با purpose reset؛ بدون نمایش وجود حساب.

**9. اعتبارسنجی:** phone معتبر؛ cooldown؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: پیام عمومی ارسال؛ offline؛ rate limit.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: فرم کوچک؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** phone، reset challenge؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** وجود حساب از پاسخ فاش نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-07 — فراموشی رمز / Forgot Password
نقش و دسترسی: مهمان یا صاحب حساب
هدف: درخواست بازیابی
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/forgot. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: phone؛ پیام عمومی؛ send؛ back login.
کامپوننت‌ها و CTA: اجزای اختصاصی: phone؛ پیام عمومی؛ send؛ back login. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: بازیابی رمز / Reset your password؛ اگر حسابی باشد کد ارسال می‌شود / If an account exists, a code will be sent؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: verify با purpose reset؛ بدون نمایش وجود حساب.
اعتبارسنجی: phone معتبر؛ cooldown؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: پیام عمومی ارسال؛ offline؛ rate limit.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: فرم کوچک؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: phone، reset challenge؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: وجود حساب از پاسخ فاش نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-08"></a>

### AUTH-08 — رمز جدید / Reset Password

**1. نام و شناسه:** AUTH-08 — رمز جدید / Reset Password

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** تغییر رمز پس از OTP

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/reset`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** verified phone؛ new/confirm؛ rules؛ finish؛ login.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: verified phone؛ new/confirm؛ rules؛ finish؛ login. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** رمز جدید / New password؛ رمز تغییر کرد / Password updated؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** save→success→login؛ نشست‌ها مطابق policy.

**9. اعتبارسنجی:** reset challenge معتبر؛ password match/policy؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: expired؛ invalid؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: form stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** reset token، policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** بدون challenge reset ممکن نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-08 — رمز جدید / Reset Password
نقش و دسترسی: مهمان یا صاحب حساب
هدف: تغییر رمز پس از OTP
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/reset. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: verified phone؛ new/confirm؛ rules؛ finish؛ login.
کامپوننت‌ها و CTA: اجزای اختصاصی: verified phone؛ new/confirm؛ rules؛ finish؛ login. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: رمز جدید / New password؛ رمز تغییر کرد / Password updated؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: save→success→login؛ نشست‌ها مطابق policy.
اعتبارسنجی: reset challenge معتبر؛ password match/policy؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: expired؛ invalid؛ saved.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: form stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: reset token، policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: بدون challenge reset ممکن نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-09"></a>

### AUTH-09 — نشست منقضی / Session Expired

**1. نام و شناسه:** AUTH-09 — نشست منقضی / Session Expired

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** ورود دوباره با حفظ کار

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/session-expired`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** پیام؛ login؛ return home؛ context خلاصه.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: پیام؛ login؛ return home؛ context خلاصه. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نشست شما پایان یافته / Your session has expired؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** فرم حساس draft حفظ امن؛ بعد auth بازگشت؛ action قبلی خودکار تکرار نشود.

**9. اعتبارسنجی:** return URL مجاز؛ داده مالی قبل auth پنهان؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty context به account؛ failed login.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: modal یا صفحه تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** expired session، safe draft، return target؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** پرداخت/تولید بعد login خودکار دوباره submit نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-09 — نشست منقضی / Session Expired
نقش و دسترسی: مهمان یا صاحب حساب
هدف: ورود دوباره با حفظ کار
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/session-expired. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: پیام؛ login؛ return home؛ context خلاصه.
کامپوننت‌ها و CTA: اجزای اختصاصی: پیام؛ login؛ return home؛ context خلاصه. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نشست شما پایان یافته / Your session has expired؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: فرم حساس draft حفظ امن؛ بعد auth بازگشت؛ action قبلی خودکار تکرار نشود.
اعتبارسنجی: return URL مجاز؛ داده مالی قبل auth پنهان؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty context به account؛ failed login.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: modal یا صفحه تمام‌عرض؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: expired session، safe draft، return target؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: پرداخت/تولید بعد login خودکار دوباره submit نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-10"></a>

### AUTH-10 — حساب محدود / Account Restricted

**1. نام و شناسه:** AUTH-10 — حساب محدود / Account Restricted

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** توضیح مسدودی/تأییدنشده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/restricted`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** icon؛ علت قابل افشا؛ verify برای unverified یا support برای blocked؛ logout.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: icon؛ علت قابل افشا؛ verify برای unverified یا support برای blocked؛ logout. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نیاز به تأیید شماره / Phone verification needed؛ حساب محدود شده / Account restricted؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** CTA بر اساس وضعیت؛ بدون bypass.

**9. اعتبارسنجی:** وضعیت server-owned؛ اطلاعات امنیت داخلی پنهان؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: blocked؛ unverified؛ status unavailable.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: پنل مرکزی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** restriction، allowed recovery؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** OTP اشتباه با blocked اشتباه نمایش ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-10 — حساب محدود / Account Restricted
نقش و دسترسی: مهمان یا صاحب حساب
هدف: توضیح مسدودی/تأییدنشده
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/restricted. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: icon؛ علت قابل افشا؛ verify برای unverified یا support برای blocked؛ logout.
کامپوننت‌ها و CTA: اجزای اختصاصی: icon؛ علت قابل افشا؛ verify برای unverified یا support برای blocked؛ logout. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نیاز به تأیید شماره / Phone verification needed؛ حساب محدود شده / Account restricted؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: CTA بر اساس وضعیت؛ بدون bypass.
اعتبارسنجی: وضعیت server-owned؛ اطلاعات امنیت داخلی پنهان؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: blocked؛ unverified؛ status unavailable.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: پنل مرکزی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: restriction، allowed recovery؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: OTP اشتباه با blocked اشتباه نمایش ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="auth-11"></a>

### AUTH-11 — خروج از حساب / Sign-out

**1. نام و شناسه:** AUTH-11 — خروج از حساب / Sign-out

**2. نقش و دسترسی:** مهمان یا صاحب حساب

**3. هدف:** خروج صریح و حفظ کار ذخیره‌شده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/auth/sign-out`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** dialog نام حساب؛ unsaved work note؛ logout/cancel.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: dialog نام حساب؛ unsaved work note؛ logout/cancel. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** خروج از حساب / Sign out؛ آیا خارج می‌شوید؟ / Sign out of your account?؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** confirm logout؛ cancel focus restore؛ بعد خروج home.

**9. اعتبارسنجی:** بدون پاک‌کردن سفارش/داده ذخیره‌شده؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: working؛ failed؛ signed out.

**11. دسکتاپ و موبایل:** دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: bottom sheet confirmation؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** session، draft dirty state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** هیچ action غیرقابل بازگشت در modal گم نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: AUTH-11 — خروج از حساب / Sign-out
نقش و دسترسی: مهمان یا صاحب حساب
هدف: خروج صریح و حفظ کار ذخیره‌شده
مسیر و ورود/خروج: مسیر پیشنهادی: /auth/sign-out. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: dialog نام حساب؛ unsaved work note؛ logout/cancel.
کامپوننت‌ها و CTA: اجزای اختصاصی: dialog نام حساب؛ unsaved work note؛ logout/cancel. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: خروج از حساب / Sign out؛ آیا خارج می‌شوید؟ / Sign out of your account?؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: confirm logout؛ cancel focus restore؛ بعد خروج home.
اعتبارسنجی: بدون پاک‌کردن سفارش/داده ذخیره‌شده؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: working؛ failed؛ signed out.
دسکتاپ و موبایل: دسکتاپ: کارت فرم max-width ۴۴۰px، لوگو و لینک بازگشت؛ بدون sidebar پنل. موبایل: bottom sheet confirmation؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: session، draft dirty state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: هیچ action غیرقابل بازگشت در modal گم نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۷. پنل مشتری

<a id="user-01"></a>

### USER-01 — داشبورد مشتری / Customer Dashboard

**1. نام و شناسه:** USER-01 — داشبورد مشتری / Customer Dashboard

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** مشاهده کارهای جاری

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** greeting؛ active orders؛ quote awaiting؛ download ready؛ favorites؛ quick buy.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: greeting؛ active orders؛ quote awaiting؛ download ready؛ favorites؛ quick buy. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** حساب من / My account؛ سفارش‌های فعال / Active orders؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** deep link وضعیت؛ جدیدها empty onboarding.

**9. اعتبارسنجی:** فقط داده خود کاربر؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بدون سفارش start shopping؛ widget error مستقل.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: sidebar drawer و کارت عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** orders، drafts، notifications، favorites؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** pending quote و paid order واضح جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-01 — داشبورد مشتری / Customer Dashboard
نقش و دسترسی: مشتری صاحب داده
هدف: مشاهده کارهای جاری
مسیر و ورود/خروج: مسیر پیشنهادی: /account. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: greeting؛ active orders؛ quote awaiting؛ download ready؛ favorites؛ quick buy.
کامپوننت‌ها و CTA: اجزای اختصاصی: greeting؛ active orders؛ quote awaiting؛ download ready؛ favorites؛ quick buy. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: حساب من / My account؛ سفارش‌های فعال / Active orders؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: deep link وضعیت؛ جدیدها empty onboarding.
اعتبارسنجی: فقط داده خود کاربر؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: بدون سفارش start shopping؛ widget error مستقل.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: sidebar drawer و کارت عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: orders، drafts، notifications، favorites؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: pending quote و paid order واضح جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-02"></a>

### USER-02 — فهرست سفارش‌ها / Orders

**1. نام و شناسه:** USER-02 — فهرست سفارش‌ها / Orders

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** یافتن سفارش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/orders`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs all/active/delivered/cancelled؛ search؛ type/date/status؛ cards/table؛ pagination.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs all/active/delivered/cancelled؛ search؛ type/date/status؛ cards/table؛ pagination. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سفارش‌های من / My orders؛ مشاهده جزئیات / View details؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** sort/filter URL؛ جزئیات هر سفارش.

**9. اعتبارسنجی:** order IDs خود کاربر؛ filter date valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no orders CTA؛ no filter results reset.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: table→cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** order summaries، totals، item statuses؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** وضعیت کلی جزئیات اقلام را پنهان نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-02 — فهرست سفارش‌ها / Orders
نقش و دسترسی: مشتری صاحب داده
هدف: یافتن سفارش
مسیر و ورود/خروج: مسیر پیشنهادی: /account/orders. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs all/active/delivered/cancelled؛ search؛ type/date/status؛ cards/table؛ pagination.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs all/active/delivered/cancelled؛ search؛ type/date/status؛ cards/table؛ pagination. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سفارش‌های من / My orders؛ مشاهده جزئیات / View details؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: sort/filter URL؛ جزئیات هر سفارش.
اعتبارسنجی: order IDs خود کاربر؛ filter date valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no orders CTA؛ no filter results reset.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: table→cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: order summaries، totals، item statuses؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: وضعیت کلی جزئیات اقلام را پنهان نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-03"></a>

### USER-03 — جزئیات سفارش / Order Detail

**1. نام و شناسه:** USER-03 — جزئیات سفارش / Order Detail

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** پیگیری کالا، پکیج و اثر

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/orders/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** header شماره/مبلغ/status؛ اقلام و اجزای پکیج؛ timeline هر قلم؛ مرسوله‌ها؛ receipt؛ allowed cancel/return/support.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: header شماره/مبلغ/status؛ اقلام و اجزای پکیج؛ timeline هر قلم؛ مرسوله‌ها؛ receipt؛ allowed cancel/return/support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** جزئیات سفارش / Order details؛ تحویل بخشی از سفارش / Partially delivered؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** CTA وضعیت‌محور؛ کد رهگیری copy؛ مشاهده draft نقاشی؛ digital download.

**9. اعتبارسنجی:** eligibility سرویس؛ مبلغ historical؛ اطلاعات خصوصی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not found/forbidden؛ shipment missing؛ partial delivered.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: timeline vertical و expandable items؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** snapshots، item timelines، shipment groups، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-15/21: مشخصات/مبلغ تاریخی؛ تحویل دیجیتال/فیزیکی تفکیک؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-03 — جزئیات سفارش / Order Detail
نقش و دسترسی: مشتری صاحب داده
هدف: پیگیری کالا، پکیج و اثر
مسیر و ورود/خروج: مسیر پیشنهادی: /account/orders/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: header شماره/مبلغ/status؛ اقلام و اجزای پکیج؛ timeline هر قلم؛ مرسوله‌ها؛ receipt؛ allowed cancel/return/support.
کامپوننت‌ها و CTA: اجزای اختصاصی: header شماره/مبلغ/status؛ اقلام و اجزای پکیج؛ timeline هر قلم؛ مرسوله‌ها؛ receipt؛ allowed cancel/return/support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: جزئیات سفارش / Order details؛ تحویل بخشی از سفارش / Partially delivered؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: CTA وضعیت‌محور؛ کد رهگیری copy؛ مشاهده draft نقاشی؛ digital download.
اعتبارسنجی: eligibility سرویس؛ مبلغ historical؛ اطلاعات خصوصی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not found/forbidden؛ shipment missing؛ partial delivered.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: timeline vertical و expandable items؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: snapshots، item timelines، shipment groups، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-15/21: مشخصات/مبلغ تاریخی؛ تحویل دیجیتال/فیزیکی تفکیک؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-04"></a>

### USER-04 — رسید و فاکتور / Receipt

**1. نام و شناسه:** USER-04 — رسید و فاکتور / Receipt

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** فهم مبلغ پرداختی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/orders/:id/invoice`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** metadata؛ اقلام/گزینه/تعداد؛ اجزای پکیج؛ تخفیف پکیج/کد؛ ارسال/مالیات؛ paid total؛ download/print.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: metadata؛ اقلام/گزینه/تعداد؛ اجزای پکیج؛ تخفیف پکیج/کد؛ ارسال/مالیات؛ paid total؛ download/print. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** رسید پرداخت / Payment receipt؛ تخفیف کد / Code discount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** نسخه historical read-only؛ نمایش مشمول/مستثنا؛ print view.

**9. اعتبارسنجی:** sum ردیف/گردکردن برابر پرداخت؛ هزینه داخلی مخفی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: invoice pending/error؛ no confirmed payment label.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: stacked rows؛ print clean؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** invoice snapshot، allocation، payment reference؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** مشتری BOM و سود نبیند؛ قیمت روز جایگزین نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-04 — رسید و فاکتور / Receipt
نقش و دسترسی: مشتری صاحب داده
هدف: فهم مبلغ پرداختی
مسیر و ورود/خروج: مسیر پیشنهادی: /account/orders/:id/invoice. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: metadata؛ اقلام/گزینه/تعداد؛ اجزای پکیج؛ تخفیف پکیج/کد؛ ارسال/مالیات؛ paid total؛ download/print.
کامپوننت‌ها و CTA: اجزای اختصاصی: metadata؛ اقلام/گزینه/تعداد؛ اجزای پکیج؛ تخفیف پکیج/کد؛ ارسال/مالیات؛ paid total؛ download/print. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: رسید پرداخت / Payment receipt؛ تخفیف کد / Code discount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: نسخه historical read-only؛ نمایش مشمول/مستثنا؛ print view.
اعتبارسنجی: sum ردیف/گردکردن برابر پرداخت؛ هزینه داخلی مخفی؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: invoice pending/error؛ no confirmed payment label.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: stacked rows؛ print clean؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: invoice snapshot، allocation، payment reference؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: مشتری BOM و سود نبیند؛ قیمت روز جایگزین نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-05"></a>

### USER-05 — درخواست لغو / Cancellation Request

**1. نام و شناسه:** USER-05 — درخواست لغو / Cancellation Request

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** لغو اقلام مجاز

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/orders/:id/cancel`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** policy summary؛ eligible items/quantity؛ reason؛ amount impact؛ confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: policy summary؛ eligible items/quantity؛ reason؛ amount impact؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** درخواست لغو / Request cancellation؛ مبلغ قابل بازگشت / Refundable amount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** submit idempotent؛ pending decision؛ بازگشت order.

**9. اعتبارسنجی:** مقدار تا باقی‌مانده؛ eligibility؛ reason required؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not eligible توضیح؛ already requested؛ submitted.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards + confirm sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** allowed items، historical paid shares، policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** لغو درخواست با بازپرداخت انجام‌شده یکسان نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-05 — درخواست لغو / Cancellation Request
نقش و دسترسی: مشتری صاحب داده
هدف: لغو اقلام مجاز
مسیر و ورود/خروج: مسیر پیشنهادی: /account/orders/:id/cancel. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: policy summary؛ eligible items/quantity؛ reason؛ amount impact؛ confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: policy summary؛ eligible items/quantity؛ reason؛ amount impact؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: درخواست لغو / Request cancellation؛ مبلغ قابل بازگشت / Refundable amount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: submit idempotent؛ pending decision؛ بازگشت order.
اعتبارسنجی: مقدار تا باقی‌مانده؛ eligibility؛ reason required؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not eligible توضیح؛ already requested؛ submitted.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards + confirm sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: allowed items، historical paid shares، policy؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: لغو درخواست با بازپرداخت انجام‌شده یکسان نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-06"></a>

### USER-06 — درخواست مرجوعی / Return Request

**1. نام و شناسه:** USER-06 — درخواست مرجوعی / Return Request

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** ثبت برگشت جزئی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/orders/:id/return`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** اجزا/quantity حتی پکیج؛ reason/photos؛ policy/shipping؛ allocated refund preview؛ submit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: اجزا/quantity حتی پکیج؛ reason/photos؛ policy/shipping؛ allocated refund preview؛ submit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** درخواست مرجوعی / Request a return؛ نیازمند بررسی کالا / Inspection required؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** انتخاب جزء؛ reference tracking؛ file retry.

**9. اعتبارسنجی:** تعداد تا delivered eligible؛ دلیل؛ file limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not eligible؛ duplicate؛ submitted؛ pending inspection.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: form wizard کوتاه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** line allocations، quantities، policies، images؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-17: سهم پرداختی مبنا، نه روز؛ وضعیت فیزیکی/مالی جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-06 — درخواست مرجوعی / Return Request
نقش و دسترسی: مشتری صاحب داده
هدف: ثبت برگشت جزئی
مسیر و ورود/خروج: مسیر پیشنهادی: /account/orders/:id/return. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: اجزا/quantity حتی پکیج؛ reason/photos؛ policy/shipping؛ allocated refund preview؛ submit.
کامپوننت‌ها و CTA: اجزای اختصاصی: اجزا/quantity حتی پکیج؛ reason/photos؛ policy/shipping؛ allocated refund preview؛ submit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: درخواست مرجوعی / Request a return؛ نیازمند بررسی کالا / Inspection required؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: انتخاب جزء؛ reference tracking؛ file retry.
اعتبارسنجی: تعداد تا delivered eligible؛ دلیل؛ file limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not eligible؛ duplicate؛ submitted؛ pending inspection.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: form wizard کوتاه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: line allocations، quantities، policies، images؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-17: سهم پرداختی مبنا، نه روز؛ وضعیت فیزیکی/مالی جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-07"></a>

### USER-07 — وضعیت مرجوعی و وجه / Return & Refund Status

**1. نام و شناسه:** USER-07 — وضعیت مرجوعی و وجه / Return & Refund Status

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** پیگیری دو فرآیند مستقل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/returns/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** return timeline؛ carrier instructions؛ inspection؛ refund timeline/amount/reference؛ support.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: return timeline؛ carrier instructions؛ inspection؛ refund timeline/amount/reference؛ support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** بازگشت کالا / Product return؛ بازپرداخت وجه / Refund؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** درخواست تکمیل عکس؛ copy reference؛ no duplicate submit.

**9. اعتبارسنجی:** فقط اطلاعات خود؛ amount server confirmed؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: rejected reason؛ refund pending؛ failed payout retry via support.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: دو timeline جدا؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** return status، refund transactions، inspection result؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** بازگشت سالم پیش از دریافت قطعی ادعا نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-07 — وضعیت مرجوعی و وجه / Return & Refund Status
نقش و دسترسی: مشتری صاحب داده
هدف: پیگیری دو فرآیند مستقل
مسیر و ورود/خروج: مسیر پیشنهادی: /account/returns/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: return timeline؛ carrier instructions؛ inspection؛ refund timeline/amount/reference؛ support.
کامپوننت‌ها و CTA: اجزای اختصاصی: return timeline؛ carrier instructions؛ inspection؛ refund timeline/amount/reference؛ support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: بازگشت کالا / Product return؛ بازپرداخت وجه / Refund؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: درخواست تکمیل عکس؛ copy reference؛ no duplicate submit.
اعتبارسنجی: فقط اطلاعات خود؛ amount server confirmed؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: rejected reason؛ refund pending؛ failed payout retry via support.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: دو timeline جدا؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: return status، refund transactions، inspection result؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: بازگشت سالم پیش از دریافت قطعی ادعا نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-08"></a>

### USER-08 — دانلودها / Digital Downloads

**1. نام و شناسه:** USER-08 — دانلودها / Digital Downloads

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** دریافت اثر دیجیتال خریداری‌شده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/downloads`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** cards preview؛ format/resolution/size/license؛ order link؛ download.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: cards preview؛ format/resolution/size/license؛ order link؛ download. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** دانلود فایل / Download file؛ هنوز آماده نیست / Not ready yet؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** لینک مجاز تازه؛ expired refresh؛ progress.

**9. اعتبارسنجی:** permission/ready status؛ فایل چاپ فروشگاه نمایش نشود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not ready؛ expired؛ no files؛ download failed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards full-width؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** entitlements، file metadata، signed link status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** public copy/private actual؛ دانلود فقط خود خریدار؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-08 — دانلودها / Digital Downloads
نقش و دسترسی: مشتری صاحب داده
هدف: دریافت اثر دیجیتال خریداری‌شده
مسیر و ورود/خروج: مسیر پیشنهادی: /account/downloads. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: cards preview؛ format/resolution/size/license؛ order link؛ download.
کامپوننت‌ها و CTA: اجزای اختصاصی: cards preview؛ format/resolution/size/license؛ order link؛ download. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: دانلود فایل / Download file؛ هنوز آماده نیست / Not ready yet؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: لینک مجاز تازه؛ expired refresh؛ progress.
اعتبارسنجی: permission/ready status؛ فایل چاپ فروشگاه نمایش نشود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not ready؛ expired؛ no files؛ download failed.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards full-width؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: entitlements، file metadata، signed link status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: public copy/private actual؛ دانلود فقط خود خریدار؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-09"></a>

### USER-09 — تأیید طرح و اصلاحات / Artwork Approval

**1. نام و شناسه:** USER-09 — تأیید طرح و اصلاحات / Artwork Approval

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** تأیید نسخه هنرمند

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/commissions/:id/review`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** نسخه فعلی large؛ version selector؛ brief؛ revision allowance؛ approve/request revision؛ conversation.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: نسخه فعلی large؛ version selector؛ brief؛ revision allowance؛ approve/request revision؛ conversation. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تأیید طرح / Approve draft؛ درخواست اصلاح / Request a revision؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** zoom؛ نسخه جدید قبلی را نگه دارد؛ approve confirmation؛ feedback typed.

**9. اعتبارسنجی:** reviewable state؛ revision policy؛ پیام لازم؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no draft؛ quota exhausted؛ revised version conflict؛ submitted.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: تصویر بالا actions bottom؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** art versions، agreement، remaining revisions، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** عدد اصلاح از توافق؛ کلیک روی نسخه قدیمی بدون هشدار تأیید نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-09 — تأیید طرح و اصلاحات / Artwork Approval
نقش و دسترسی: مشتری صاحب داده
هدف: تأیید نسخه هنرمند
مسیر و ورود/خروج: مسیر پیشنهادی: /account/commissions/:id/review. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: نسخه فعلی large؛ version selector؛ brief؛ revision allowance؛ approve/request revision؛ conversation.
کامپوننت‌ها و CTA: اجزای اختصاصی: نسخه فعلی large؛ version selector؛ brief؛ revision allowance؛ approve/request revision؛ conversation. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تأیید طرح / Approve draft؛ درخواست اصلاح / Request a revision؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: zoom؛ نسخه جدید قبلی را نگه دارد؛ approve confirmation؛ feedback typed.
اعتبارسنجی: reviewable state؛ revision policy؛ پیام لازم؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no draft؛ quota exhausted؛ revised version conflict؛ submitted.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: تصویر بالا actions bottom؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: art versions، agreement، remaining revisions، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: عدد اصلاح از توافق؛ کلیک روی نسخه قدیمی بدون هشدار تأیید نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-10"></a>

### USER-10 — علاقه‌مندی / Favorites

**1. نام و شناسه:** USER-10 — علاقه‌مندی / Favorites

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** نگهداری محصول، اثر، پکیج

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/favorites`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs؛ grid؛ remove/undo؛ available badge؛ detail CTA.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs؛ grid؛ remove/undo؛ available badge؛ detail CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** علاقه‌مندی‌ها / Favorites؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** favorite sync؛ remove undo؛ purchase new prices.

**9. اعتبارسنجی:** بدون خرید ناموجود مستقیم؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty browse؛ discontinued item اطلاع.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: دو ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** saved product/art/bundle references؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** قیمت/stock روز واضح؛ SKU تاریخی ساخته نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-10 — علاقه‌مندی / Favorites
نقش و دسترسی: مشتری صاحب داده
هدف: نگهداری محصول، اثر، پکیج
مسیر و ورود/خروج: مسیر پیشنهادی: /account/favorites. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs؛ grid؛ remove/undo؛ available badge؛ detail CTA.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs؛ grid؛ remove/undo؛ available badge؛ detail CTA. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: علاقه‌مندی‌ها / Favorites؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: favorite sync؛ remove undo؛ purchase new prices.
اعتبارسنجی: بدون خرید ناموجود مستقیم؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty browse؛ discontinued item اطلاع.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: دو ستون؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: saved product/art/bundle references؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: قیمت/stock روز واضح؛ SKU تاریخی ساخته نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-11"></a>

### USER-11 — آدرس‌ها / Addresses

**1. نام و شناسه:** USER-11 — آدرس‌ها / Addresses

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** مدیریت چند مقصد

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/addresses`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** cards default؛ add؛ edit form؛ delete confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: cards default؛ add؛ edit form؛ delete confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** آدرس‌های من / My addresses؛ آدرس پیش‌فرض / Default address؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** set default؛ order historical address تغییر نکند.

**9. اعتبارسنجی:** country rules required؛ postcode/phone؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no addresses add؛ save/delete error حفظ.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards/sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** address records، rules؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** ویرایش دفترچه آدرس، سفارش قبلی را تغییر ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-11 — آدرس‌ها / Addresses
نقش و دسترسی: مشتری صاحب داده
هدف: مدیریت چند مقصد
مسیر و ورود/خروج: مسیر پیشنهادی: /account/addresses. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: cards default؛ add؛ edit form؛ delete confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: cards default؛ add؛ edit form؛ delete confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: آدرس‌های من / My addresses؛ آدرس پیش‌فرض / Default address؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: set default؛ order historical address تغییر نکند.
اعتبارسنجی: country rules required؛ postcode/phone؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no addresses add؛ save/delete error حفظ.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards/sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: address records، rules؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: ویرایش دفترچه آدرس، سفارش قبلی را تغییر ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-12"></a>

### USER-12 — پروفایل / Profile

**1. نام و شناسه:** USER-12 — پروفایل / Profile

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** اطلاعات شخصی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/profile`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** name/avatar؛ phone verified؛ optional email؛ change phone OTP؛ save.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: name/avatar؛ phone verified؛ optional email؛ change phone OTP؛ save. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اطلاعات من / My details؛ شماره تأییدشده / Verified phone؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** save feedback؛ تغییر شماره جریان تأیید جدید.

**9. اعتبارسنجی:** نام required طبق config؛ email format؛ شماره جدید verified؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: save failed؛ upload partial؛ phone challenge.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: fields stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** profile، phone verification، avatar؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** تغییر تلفن بدون تأیید ممکن نباشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-12 — پروفایل / Profile
نقش و دسترسی: مشتری صاحب داده
هدف: اطلاعات شخصی
مسیر و ورود/خروج: مسیر پیشنهادی: /account/profile. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: name/avatar؛ phone verified؛ optional email؛ change phone OTP؛ save.
کامپوننت‌ها و CTA: اجزای اختصاصی: name/avatar؛ phone verified؛ optional email؛ change phone OTP؛ save. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اطلاعات من / My details؛ شماره تأییدشده / Verified phone؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: save feedback؛ تغییر شماره جریان تأیید جدید.
اعتبارسنجی: نام required طبق config؛ email format؛ شماره جدید verified؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: save failed؛ upload partial؛ phone challenge.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: fields stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: profile، phone verification، avatar؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: تغییر تلفن بدون تأیید ممکن نباشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-13"></a>

### USER-13 — امنیت / Security

**1. نام و شناسه:** USER-13 — امنیت / Security

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** تغییر رمز و نشست‌ها

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/security`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** current/new/confirm/show؛ rules؛ sessions؛ logout all confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: current/new/confirm/show؛ rules؛ sessions؛ logout all confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** امنیت حساب / Account security؛ تغییر رمز / Change password؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** password save؛ current session طبق policy؛ session revoke.

**9. اعتبارسنجی:** password policy؛ matching؛ permission؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: wrong current؛ expired session؛ updated.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: form cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** password policy، masked sessions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** رمز ذخیره‌شده نمایش داده نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-13 — امنیت / Security
نقش و دسترسی: مشتری صاحب داده
هدف: تغییر رمز و نشست‌ها
مسیر و ورود/خروج: مسیر پیشنهادی: /account/security. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: current/new/confirm/show؛ rules؛ sessions؛ logout all confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: current/new/confirm/show؛ rules؛ sessions؛ logout all confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: امنیت حساب / Account security؛ تغییر رمز / Change password؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: password save؛ current session طبق policy؛ session revoke.
اعتبارسنجی: password policy؛ matching؛ permission؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: wrong current؛ expired session؛ updated.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: form cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: password policy، masked sessions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: رمز ذخیره‌شده نمایش داده نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-14"></a>

### USER-14 — تنظیمات زبان و اعلان / Preferences

**1. نام و شناسه:** USER-14 — تنظیمات زبان و اعلان / Preferences

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** انتخاب تجربه و کانال‌ها

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/preferences`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** locale radio؛ preview direction؛ email/SMS toggles؛ transactional note؛ save.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: locale radio؛ preview direction؛ email/SMS toggles؛ transactional note؛ save. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** زبان و اعلان‌ها / Language and notifications؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** locale UI فوراً؛ dirty guard؛ channel unsupported disabled.

**9. اعتبارسنجی:** درخواست‌ها مطابق کانال واقعی؛ پیام عملیاتی ضروری policy؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: save error rollback؛ no channel.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: controls vertical؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** preferences، channels availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** زبان ارز را تغییر ندهد؛ تغییرهای ذخیره‌نشده مشخص؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-14 — تنظیمات زبان و اعلان / Preferences
نقش و دسترسی: مشتری صاحب داده
هدف: انتخاب تجربه و کانال‌ها
مسیر و ورود/خروج: مسیر پیشنهادی: /account/preferences. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: locale radio؛ preview direction؛ email/SMS toggles؛ transactional note؛ save.
کامپوننت‌ها و CTA: اجزای اختصاصی: locale radio؛ preview direction؛ email/SMS toggles؛ transactional note؛ save. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: زبان و اعلان‌ها / Language and notifications؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: locale UI فوراً؛ dirty guard؛ channel unsupported disabled.
اعتبارسنجی: درخواست‌ها مطابق کانال واقعی؛ پیام عملیاتی ضروری policy؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: save error rollback؛ no channel.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: controls vertical؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: preferences، channels availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: زبان ارز را تغییر ندهد؛ تغییرهای ذخیره‌نشده مشخص؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-15"></a>

### USER-15 — پشتیبانی و تیکت جدید / Support

**1. نام و شناسه:** USER-15 — پشتیبانی و تیکت جدید / Support

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** ثبت و یافتن گفتگو

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/support`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** ticket list/filter؛ new form order/category/subject/message/attachments؛ submit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: ticket list/filter؛ new form order/category/subject/message/attachments؛ submit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پشتیبانی / Support؛ تیکت جدید / New ticket؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** order select مالک؛ upload progress؛ new reference.

**9. اعتبارسنجی:** required fields/file limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty CTA؛ send failed draft حفظ؛ created.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards سپس form؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** tickets، owned orders، categories؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** ارسال تکراری در loading قفل؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-15 — پشتیبانی و تیکت جدید / Support
نقش و دسترسی: مشتری صاحب داده
هدف: ثبت و یافتن گفتگو
مسیر و ورود/خروج: مسیر پیشنهادی: /account/support. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: ticket list/filter؛ new form order/category/subject/message/attachments؛ submit.
کامپوننت‌ها و CTA: اجزای اختصاصی: ticket list/filter؛ new form order/category/subject/message/attachments؛ submit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پشتیبانی / Support؛ تیکت جدید / New ticket؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: order select مالک؛ upload progress؛ new reference.
اعتبارسنجی: required fields/file limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty CTA؛ send failed draft حفظ؛ created.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: cards سپس form؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: tickets، owned orders، categories؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: ارسال تکراری در loading قفل؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-16"></a>

### USER-16 — جزئیات تیکت / Ticket Thread

**1. نام و شناسه:** USER-16 — جزئیات تیکت / Ticket Thread

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** گفتگو و حل مسئله

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/support/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** subject/status؛ مرتبط order؛ messages/time/attachments؛ reply؛ close/reopen طبق مجوز.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: subject/status؛ مرتبط order؛ messages/time/attachments؛ reply؛ close/reopen طبق مجوز. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پاسخ به تیکت / Reply to ticket؛ حل شد / Resolved؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** reply append؛ file retry؛ unread indicator.

**9. اعتبارسنجی:** thread permission؛ nonempty reply؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty thread state؛ reply failed preserved؛ closed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: chat single column؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** conversation، attachments، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** ترتیب زمانی ثابت در RTL و LTR؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-16 — جزئیات تیکت / Ticket Thread
نقش و دسترسی: مشتری صاحب داده
هدف: گفتگو و حل مسئله
مسیر و ورود/خروج: مسیر پیشنهادی: /account/support/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: subject/status؛ مرتبط order؛ messages/time/attachments؛ reply؛ close/reopen طبق مجوز.
کامپوننت‌ها و CTA: اجزای اختصاصی: subject/status؛ مرتبط order؛ messages/time/attachments؛ reply؛ close/reopen طبق مجوز. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پاسخ به تیکت / Reply to ticket؛ حل شد / Resolved؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: reply append؛ file retry؛ unread indicator.
اعتبارسنجی: thread permission؛ nonempty reply؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty thread state؛ reply failed preserved؛ closed.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: chat single column؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: conversation، attachments، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: ترتیب زمانی ثابت در RTL و LTR؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="user-17"></a>

### USER-17 — اعلان‌ها / Notifications

**1. نام و شناسه:** USER-17 — اعلان‌ها / Notifications

**2. نقش و دسترسی:** مشتری صاحب داده

**3. هدف:** اقدام روی رویداد

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/account/notifications`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** unread/all؛ list icon/text/time؛ mark read؛ deep links.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: unread/all؛ list icon/text/time؛ mark read؛ deep links. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اعلان‌ها / Notifications؛ همه خوانده شد / All caught up؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** read on open؛ mark all؛ link specific order.

**9. اعتبارسنجی:** user ownership؛ target inaccessible fallback؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty caught up؛ read failure retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: list full width؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** events، read state، action URLs؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** اعلان قیمت مربوط مالک در پنل مشتری نیاید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: USER-17 — اعلان‌ها / Notifications
نقش و دسترسی: مشتری صاحب داده
هدف: اقدام روی رویداد
مسیر و ورود/خروج: مسیر پیشنهادی: /account/notifications. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: unread/all؛ list icon/text/time؛ mark read؛ deep links.
کامپوننت‌ها و CTA: اجزای اختصاصی: unread/all؛ list icon/text/time؛ mark read؛ deep links. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اعلان‌ها / Notifications؛ همه خوانده شد / All caught up؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: read on open؛ mark all؛ link specific order.
اعتبارسنجی: user ownership؛ target inaccessible fallback؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty caught up؛ read failure retry.
دسکتاپ و موبایل: دسکتاپ: پوسته مشتری با sidebar ۲۴۸px و header حساب، breadcrumb و زبان؛ محتوای ۱۲۸۰px. موبایل: list full width؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: events، read state، action URLs؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: اعلان قیمت مربوط مالک در پنل مشتری نیاید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۸. پنل هنرمند

<a id="art-01"></a>

### ART-01 — داشبورد هنرمند / Artist Dashboard

**1. نام و شناسه:** ART-01 — داشبورد هنرمند / Artist Dashboard

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** اولویت‌بندی کار

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** new/review/in production/approval counts؛ deadlines؛ priority queue؛ announcements.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: new/review/in production/approval counts؛ deadlines؛ priority queue؛ announcements. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** کارهای امروز / Today's work؛ در انتظار اقدام / Needs action؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** deep link assigned only؛ ETA alerts.

**9. اعتبارسنجی:** بدون گزارش هزینه فروشگاه؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no assignments؛ widget retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: cards + drawer؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** assigned summaries، due dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** فقط تخصیص خود؛ مراحل پیش/پس پرداخت جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-01 — داشبورد هنرمند / Artist Dashboard
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: اولویت‌بندی کار
مسیر و ورود/خروج: مسیر پیشنهادی: /artist. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: new/review/in production/approval counts؛ deadlines؛ priority queue؛ announcements.
کامپوننت‌ها و CTA: اجزای اختصاصی: new/review/in production/approval counts؛ deadlines؛ priority queue؛ announcements. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: کارهای امروز / Today's work؛ در انتظار اقدام / Needs action؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: deep link assigned only؛ ETA alerts.
اعتبارسنجی: بدون گزارش هزینه فروشگاه؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no assignments؛ widget retry.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: cards + drawer؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: assigned summaries، due dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: فقط تخصیص خود؛ مراحل پیش/پس پرداخت جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="art-02"></a>

### ART-02 — سفارش‌های هنرمند / Assigned Orders

**1. نام و شناسه:** ART-02 — سفارش‌های هنرمند / Assigned Orders

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** یافتن سفارش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist/orders`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs review/active/approval/completed؛ filters style/deadline؛ table.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs review/active/approval/completed؛ filters style/deadline؛ table. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سفارش‌های تخصیص‌یافته / Assigned orders؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** open/accept per permission؛ overdue badge.

**9. اعتبارسنجی:** deadline filter valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no orders؛ filtered none؛ permission.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: table→cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** assigned orders، state، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** سفارش فروشگاهی وارد تولید سفارشی هنرمند نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-02 — سفارش‌های هنرمند / Assigned Orders
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: یافتن سفارش
مسیر و ورود/خروج: مسیر پیشنهادی: /artist/orders. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs review/active/approval/completed؛ filters style/deadline؛ table.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs review/active/approval/completed؛ filters style/deadline؛ table. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سفارش‌های تخصیص‌یافته / Assigned orders؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: open/accept per permission؛ overdue badge.
اعتبارسنجی: deadline filter valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no orders؛ filtered none؛ permission.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: table→cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: assigned orders، state، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: سفارش فروشگاهی وارد تولید سفارشی هنرمند نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="art-03"></a>

### ART-03 — بررسی سفارش / Artist Order Detail

**1. نام و شناسه:** ART-03 — بررسی سفارش / Artist Order Detail

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** دیدن مرجع و توافق

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist/orders/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** images zoom؛ prompt؛ style/size/type؛ agreement؛ AI؛ time estimate؛ internal notes؛ accept/reject with reason.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: images zoom؛ prompt؛ style/size/type؛ agreement؛ AI؛ time estimate؛ internal notes؛ accept/reject with reason. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** شرح سفارش / Order brief؛ پذیرش / Accept؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** reference private؛ accept→review/work؛ rejection to admin queue.

**9. اعتبارسنجی:** required reason for reject؛ assignment current؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: reference missing؛ reassigned conflict؛ accepted.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: reference بالا؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** brief، files، quote، assignment، agreement؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** input customer read-only؛ notes داخلی از پیام مشتری جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-03 — بررسی سفارش / Artist Order Detail
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: دیدن مرجع و توافق
مسیر و ورود/خروج: مسیر پیشنهادی: /artist/orders/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: images zoom؛ prompt؛ style/size/type؛ agreement؛ AI؛ time estimate؛ internal notes؛ accept/reject with reason.
کامپوننت‌ها و CTA: اجزای اختصاصی: images zoom؛ prompt؛ style/size/type؛ agreement؛ AI؛ time estimate؛ internal notes؛ accept/reject with reason. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: شرح سفارش / Order brief؛ پذیرش / Accept؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: reference private؛ accept→review/work؛ rejection to admin queue.
اعتبارسنجی: required reason for reject؛ assignment current؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: reference missing؛ reassigned conflict؛ accepted.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: reference بالا؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: brief، files، quote، assignment، agreement؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: input customer read-only؛ notes داخلی از پیام مشتری جدا؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="art-04"></a>

### ART-04 — بررسی ضریب سختی / Difficulty Review

**1. نام و شناسه:** ART-04 — بررسی ضریب سختی / Difficulty Review

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** تأیید یا اصلاح AI قبل پرداخت

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist/orders/:id/difficulty`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** AI D/evidence؛ editable D؛ reason؛ old/new quote؛ submit confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: AI D/evidence؛ editable D؛ reason؛ old/new quote؛ submit confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اصلاح ضریب / Adjust difficulty؛ دلیل اصلاح / Reason for adjustment؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** range slider+numeric؛ override impact؛ submit به مشتری/admin.

**9. اعتبارسنجی:** ۱<=D<=۳؛ reason override required؛ version fresh؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: AI absent manual review؛ stale quote؛ saved awaiting customer.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: compare stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** AI result، previous quote، formula، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** قیمت مشتری بدون رضایت نهایی اعمال نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-04 — بررسی ضریب سختی / Difficulty Review
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: تأیید یا اصلاح AI قبل پرداخت
مسیر و ورود/خروج: مسیر پیشنهادی: /artist/orders/:id/difficulty. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: AI D/evidence؛ editable D؛ reason؛ old/new quote؛ submit confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: AI D/evidence؛ editable D؛ reason؛ old/new quote؛ submit confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اصلاح ضریب / Adjust difficulty؛ دلیل اصلاح / Reason for adjustment؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: range slider+numeric؛ override impact؛ submit به مشتری/admin.
اعتبارسنجی: ۱<=D<=۳؛ reason override required؛ version fresh؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: AI absent manual review؛ stale quote؛ saved awaiting customer.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: compare stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: AI result، previous quote، formula، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: قیمت مشتری بدون رضایت نهایی اعمال نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="art-05"></a>

### ART-05 — اجرای سفارش / Production Workspace

**1. نام و شناسه:** ART-05 — اجرای سفارش / Production Workspace

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** مدیریت اجرا و نسخه‌ها

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist/orders/:id/work`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** paid/agreement banner؛ status/ETA؛ draft upload؛ version history؛ feedback/revision؛ final upload؛ costs tab با مجوز.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: paid/agreement banner؛ status/ETA؛ draft upload؛ version history؛ feedback/revision؛ final upload؛ costs tab با مجوز. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ارسال برای تأیید / Send for approval؛ فایل نهایی / Final file؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** save draft then send approval؛ final confirmation؛ actual time/materials قابل ثبت.

**9. اعتبارسنجی:** paid/authorized start؛ limits/resolution؛ version/remaining revisions؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: upload retry؛ old customer feedback؛ no versions؛ submitted.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: uploader و actions عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** workflow، versions، agreement، cost entries allowed؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** درخواست بررسی قبل پرداخت با اجرای سفارش پرداخت‌شده یکی نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-05 — اجرای سفارش / Production Workspace
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: مدیریت اجرا و نسخه‌ها
مسیر و ورود/خروج: مسیر پیشنهادی: /artist/orders/:id/work. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: paid/agreement banner؛ status/ETA؛ draft upload؛ version history؛ feedback/revision؛ final upload؛ costs tab با مجوز.
کامپوننت‌ها و CTA: اجزای اختصاصی: paid/agreement banner؛ status/ETA؛ draft upload؛ version history؛ feedback/revision؛ final upload؛ costs tab با مجوز. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ارسال برای تأیید / Send for approval؛ فایل نهایی / Final file؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: save draft then send approval؛ final confirmation؛ actual time/materials قابل ثبت.
اعتبارسنجی: paid/authorized start؛ limits/resolution؛ version/remaining revisions؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: upload retry؛ old customer feedback؛ no versions؛ submitted.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: uploader و actions عمودی؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: workflow، versions، agreement، cost entries allowed؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: درخواست بررسی قبل پرداخت با اجرای سفارش پرداخت‌شده یکی نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="art-06"></a>

### ART-06 — سوابق هنرمند / Artist History

**1. نام و شناسه:** ART-06 — سوابق هنرمند / Artist History

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** مشاهده کارهای تکمیل‌شده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist/history`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters date/type؛ order history؛ output preview؛ details.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters date/type؛ order history؛ output preview؛ details. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سوابق کار / Work history؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** read-only completed؛ export فقط مجاز.

**9. اعتبارسنجی:** assigned ownership؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ error retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** completed assignments؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** فایل مشتری خارج از مجوز به نمونه‌کار عمومی منتقل نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-06 — سوابق هنرمند / Artist History
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: مشاهده کارهای تکمیل‌شده
مسیر و ورود/خروج: مسیر پیشنهادی: /artist/history. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters date/type؛ order history؛ output preview؛ details.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters date/type؛ order history؛ output preview؛ details. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سوابق کار / Work history؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: read-only completed؛ export فقط مجاز.
اعتبارسنجی: assigned ownership؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ error retry.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: completed assignments؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: فایل مشتری خارج از مجوز به نمونه‌کار عمومی منتقل نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="art-07"></a>

### ART-07 — پروفایل و تنظیمات هنرمند / Artist Profile

**1. نام و شناسه:** ART-07 — پروفایل و تنظیمات هنرمند / Artist Profile

**2. نقش و دسترسی:** هنرمند تخصیص‌یافته

**3. هدف:** نمایش معرفی و نمونه‌کار مجاز

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/artist/profile`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** portrait/bio/fa-en؛ specialties؛ portfolio upload/reorder؛ availability؛ notifications.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: portrait/bio/fa-en؛ specialties؛ portfolio upload/reorder؛ availability؛ notifications. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نمونه‌کارها / Portfolio؛ وضعیت پذیرش سفارش / Availability؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** preview profile؛ publish طبق permission؛ portfolio consent.

**9. اعتبارسنجی:** file rules؛ نمایش کار مشتری فقط با مجوز؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty portfolio؛ invalid asset؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: form single column؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** profile، approved portfolio، availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** درآمد یا دستمزد توافق‌نشده ساخته نشود؛ حسابداری عمومی پنهان؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ART-07 — پروفایل و تنظیمات هنرمند / Artist Profile
نقش و دسترسی: هنرمند تخصیص‌یافته
هدف: نمایش معرفی و نمونه‌کار مجاز
مسیر و ورود/خروج: مسیر پیشنهادی: /artist/profile. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: portrait/bio/fa-en؛ specialties؛ portfolio upload/reorder؛ availability؛ notifications.
کامپوننت‌ها و CTA: اجزای اختصاصی: portrait/bio/fa-en؛ specialties؛ portfolio upload/reorder؛ availability؛ notifications. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نمونه‌کارها / Portfolio؛ وضعیت پذیرش سفارش / Availability؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: preview profile؛ publish طبق permission؛ portfolio consent.
اعتبارسنجی: file rules؛ نمایش کار مشتری فقط با مجوز؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty portfolio؛ invalid asset؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته مستقل هنرمند با sidebar ۲۴۸px، breadcrumb و اعلان؛ مجوز تخصیص رعایت شود. موبایل: form single column؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: profile، approved portfolio، availability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: درآمد یا دستمزد توافق‌نشده ساخته نشود؛ حسابداری عمومی پنهان؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۹. پنل ادمین: کاتالوگ و مدیریت

<a id="adm-01"></a>

### ADM-01 — داشبورد ادمین / Admin Dashboard

**1. نام و شناسه:** ADM-01 — داشبورد ادمین / Admin Dashboard

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** دیدن اولویت‌های کسب‌وکار

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** date range؛ sales/profit KPIs labelled؛ queue price review؛ low stock؛ orders/returns؛ settlement alerts؛ activity.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: date range؛ sales/profit KPIs labelled؛ queue price review؛ low stock؛ orders/returns؛ settlement alerts؛ activity. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نمای کسب‌وکار / Business overview؛ نیازمند رسیدگی / Needs attention؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** widget permission؛ deep links صف؛ historical/replacement tab مستقل.

**9. اعتبارسنجی:** date valid؛ KPI source label؛ هم‌پوشانی کالکشن واضح؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no data؛ stale metrics؛ each widget retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: KPIs دو ستون، charts compact؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** metrics، queues، data freshness، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** سود تحقق/برآورد جدا؛ کارت rate-change فقط internal؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-01 — داشبورد ادمین / Admin Dashboard
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: دیدن اولویت‌های کسب‌وکار
مسیر و ورود/خروج: مسیر پیشنهادی: /admin. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: date range؛ sales/profit KPIs labelled؛ queue price review؛ low stock؛ orders/returns؛ settlement alerts؛ activity.
کامپوننت‌ها و CTA: اجزای اختصاصی: date range؛ sales/profit KPIs labelled؛ queue price review؛ low stock؛ orders/returns؛ settlement alerts؛ activity. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نمای کسب‌وکار / Business overview؛ نیازمند رسیدگی / Needs attention؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: widget permission؛ deep links صف؛ historical/replacement tab مستقل.
اعتبارسنجی: date valid؛ KPI source label؛ هم‌پوشانی کالکشن واضح؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no data؛ stale metrics؛ each widget retry.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: KPIs دو ستون، charts compact؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: metrics، queues، data freshness، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: سود تحقق/برآورد جدا؛ کارت rate-change فقط internal؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-02"></a>

### ADM-02 — مدیریت کالکشن / Collections Admin

**1. نام و شناسه:** ADM-02 — مدیریت کالکشن / Collections Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** سازماندهی دنیاهای تصویری

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/collections`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** table تصویر/fa-en/slug/status/count؛ search؛ reorder؛ create/edit/archive.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: table تصویر/fa-en/slug/status/count؛ search؛ reorder؛ create/edit/archive. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مدیریت کالکشن‌ها / Manage collections؛ پیش‌نمایش / Preview؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** افزودن رابطه محصول/پکیج؛ draft preview؛ archive بدون حذف موجودی.

**9. اعتبارسنجی:** unique slug؛ fa/en required برای publish؛ media valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty create؛ duplicate slug؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards؛ editor stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** collections، linked entity IDs، translations؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** کپی موجودی با اضافه کالکشن رخ ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-02 — مدیریت کالکشن / Collections Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: سازماندهی دنیاهای تصویری
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/collections. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: table تصویر/fa-en/slug/status/count؛ search؛ reorder؛ create/edit/archive.
کامپوننت‌ها و CTA: اجزای اختصاصی: table تصویر/fa-en/slug/status/count؛ search؛ reorder؛ create/edit/archive. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مدیریت کالکشن‌ها / Manage collections؛ پیش‌نمایش / Preview؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: افزودن رابطه محصول/پکیج؛ draft preview؛ archive بدون حذف موجودی.
اعتبارسنجی: unique slug؛ fa/en required برای publish؛ media valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty create؛ duplicate slug؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards؛ editor stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: collections، linked entity IDs، translations؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: کپی موجودی با اضافه کالکشن رخ ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-03"></a>

### ADM-03 — مدیریت دسته / Categories Admin

**1. نام و شناسه:** ADM-03 — مدیریت دسته / Categories Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** طبقه‌بندی نوع محصول

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/categories`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tree/list؛ title/fa-en/slug؛ parent؛ attributes applicable؛ order/status.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tree/list؛ title/fa-en/slug؛ parent؛ attributes applicable؛ order/status. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** دسته‌های محصول / Product categories؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** drag reorder همراه buttons؛ link existing products.

**9. اعتبارسنجی:** cycle ممنوع؛ slug unique؛ parent valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ invalid parent؛ archived linked notice.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: tree indentation + edit sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** category tree، links، attribute applicability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** دسته با کالکشن یکی نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-03 — مدیریت دسته / Categories Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: طبقه‌بندی نوع محصول
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/categories. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tree/list؛ title/fa-en/slug؛ parent؛ attributes applicable؛ order/status.
کامپوننت‌ها و CTA: اجزای اختصاصی: tree/list؛ title/fa-en/slug؛ parent؛ attributes applicable؛ order/status. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: دسته‌های محصول / Product categories؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: drag reorder همراه buttons؛ link existing products.
اعتبارسنجی: cycle ممنوع؛ slug unique؛ parent valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ invalid parent؛ archived linked notice.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: tree indentation + edit sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: category tree، links، attribute applicability؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: دسته با کالکشن یکی نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-04"></a>

### ADM-04 — فهرست محصولات / Products Admin

**1. نام و شناسه:** ADM-04 — فهرست محصولات / Products Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** یافتن کالای آماده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/products`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters category/collection/status/stock؛ rows image/name/SKU count/price؛ bulk archive؛ new.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters category/collection/status/stock؛ rows image/name/SKU count/price؛ bulk archive؛ new. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** محصولات / Products؛ ایجاد محصول / Create product؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** open edit؛ publish validation؛ duplicate فقط draft بدون کپی stock.

**9. اعتبارسنجی:** permissions؛ bulk scope explicit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no products؛ filtered none؛ bulk partial errors.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards with key fields؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** products، summary variants، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** تعداد موجودی از انبار؛ editable stock shortcut بدون سند نداشته باشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-04 — فهرست محصولات / Products Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: یافتن کالای آماده
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/products. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters category/collection/status/stock؛ rows image/name/SKU count/price؛ bulk archive؛ new.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters category/collection/status/stock؛ rows image/name/SKU count/price؛ bulk archive؛ new. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: محصولات / Products؛ ایجاد محصول / Create product؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: open edit؛ publish validation؛ duplicate فقط draft بدون کپی stock.
اعتبارسنجی: permissions؛ bulk scope explicit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no products؛ filtered none؛ bulk partial errors.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards with key fields؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: products، summary variants، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: تعداد موجودی از انبار؛ editable stock shortcut بدون سند نداشته باشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-05"></a>

### ADM-05 — فرم محصول / Product Editor

**1. نام و شناسه:** ADM-05 — فرم محصول / Product Editor

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** تألیف محتوا و گزینه‌ها

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/products/:id/edit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs عمومی/fa-en/گالری/گزینه/شرایط/SEO؛ collection multi-select؛ category؛ specs؛ preview/publish.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs عمومی/fa-en/گالری/گزینه/شرایط/SEO؛ collection multi-select؛ category؛ specs؛ preview/publish. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مشخصات محصول / Product details؛ انتشار / Publish؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** autosave draft؛ publish checklist؛ SKU link؛ gsm fixed spec.

**9. اعتبارسنجی:** name/slug؛ translations؛ media public role؛ SKU valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: unsaved guard؛ missing translation؛ conflict؛ published.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: tabs scroll و sticky save؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** product content، relation IDs، options schema، policies؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** نام/طرح از filename حدس نزند؛ فایل خصوصی public نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-05 — فرم محصول / Product Editor
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: تألیف محتوا و گزینه‌ها
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/products/:id/edit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs عمومی/fa-en/گالری/گزینه/شرایط/SEO؛ collection multi-select؛ category؛ specs؛ preview/publish.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs عمومی/fa-en/گالری/گزینه/شرایط/SEO؛ collection multi-select؛ category؛ specs؛ preview/publish. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مشخصات محصول / Product details؛ انتشار / Publish؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: autosave draft؛ publish checklist؛ SKU link؛ gsm fixed spec.
اعتبارسنجی: name/slug؛ translations؛ media public role؛ SKU valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: unsaved guard؛ missing translation؛ conflict؛ published.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: tabs scroll و sticky save؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: product content، relation IDs، options schema، policies؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: نام/طرح از filename حدس نزند؛ فایل خصوصی public نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-06"></a>

### ADM-06 — گزینه‌ها و SKU / Variant Matrix

**1. نام و شناسه:** ADM-06 — گزینه‌ها و SKU / Variant Matrix

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** تعریف ترکیب‌های واقعی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/products/:id/variants`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** attribute definitions؛ combinations table size/sheets/cover/print؛ SKU/image/weight/price/status؛ BOM link؛ stock read-only.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: attribute definitions؛ combinations table size/sheets/cover/print؛ SKU/image/weight/price/status؛ BOM link؛ stock read-only. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ترکیب قابل فروش / Sellable variant؛ موجودی فقط‌خواندنی / Read-only stock؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** create selected combinations فقط؛ bulk price به review؛ incompatible combinations absent؛ preview.

**9. اعتبارسنجی:** SKU unique؛ count/weight positive؛ price currency explicit؛ no duplicate combo؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing variant؛ validation per cell؛ archived SKU with stock warning.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: horizontal matrix scroll labelled، detail drawer؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** variants، allowed values، BOM versions، stock projections؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-03/04: تعداد دفتر attribute SKU نیست؛ گرماژ ثابت مگر خانواده دیگری؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-06 — گزینه‌ها و SKU / Variant Matrix
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: تعریف ترکیب‌های واقعی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/products/:id/variants. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: attribute definitions؛ combinations table size/sheets/cover/print؛ SKU/image/weight/price/status؛ BOM link؛ stock read-only.
کامپوننت‌ها و CTA: اجزای اختصاصی: attribute definitions؛ combinations table size/sheets/cover/print؛ SKU/image/weight/price/status؛ BOM link؛ stock read-only. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ترکیب قابل فروش / Sellable variant؛ موجودی فقط‌خواندنی / Read-only stock؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: create selected combinations فقط؛ bulk price به review؛ incompatible combinations absent؛ preview.
اعتبارسنجی: SKU unique؛ count/weight positive؛ price currency explicit؛ no duplicate combo؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing variant؛ validation per cell؛ archived SKU with stock warning.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: horizontal matrix scroll labelled، detail drawer؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: variants، allowed values، BOM versions، stock projections؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-03/04: تعداد دفتر attribute SKU نیست؛ گرماژ ثابت مگر خانواده دیگری؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-07"></a>

### ADM-07 — مدیریت پکیج / Bundles Admin

**1. نام و شناسه:** ADM-07 — مدیریت پکیج / Bundles Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** کنترل مجموعه‌های تخفیفی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/bundles`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list name/collections/component count/discount/availability/margin warning؛ edit/new.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list name/collections/component count/discount/availability/margin warning؛ edit/new. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پکیج‌ها / Bundles؛ ویرایش پکیج / Edit bundle؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** open detail؛ archive؛ preview customer.

**9. اعتبارسنجی:** permission؛ published only valid bundles؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ incomplete components؛ low margin.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** bundle summaries، availability، cost estimates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** پکیج stock field دستی ندارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-07 — مدیریت پکیج / Bundles Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: کنترل مجموعه‌های تخفیفی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/bundles. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list name/collections/component count/discount/availability/margin warning؛ edit/new.
کامپوننت‌ها و CTA: اجزای اختصاصی: list name/collections/component count/discount/availability/margin warning؛ edit/new. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پکیج‌ها / Bundles؛ ویرایش پکیج / Edit bundle؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: open detail؛ archive؛ preview customer.
اعتبارسنجی: permission؛ published only valid bundles؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ incomplete components؛ low margin.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: bundle summaries، availability، cost estimates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: پکیج stock field دستی ندارد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-08"></a>

### ADM-08 — فرم پکیج / Bundle Editor

**1. نام و شناسه:** ADM-08 — فرم پکیج / Bundle Editor

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** تعریف اجزا و گزینه مجاز

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/bundles/:id/edit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** name/media/fa-en/collections؛ component picker product/required quantity/allowed SKU؛ discount fixed/percent؛ package cost/BOM؛ stacking exception؛ preview.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: name/media/fa-en/collections؛ component picker product/required quantity/allowed SKU؛ discount fixed/percent؛ package cost/BOM؛ stacking exception؛ preview. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اجزای پکیج / Bundle components؛ گزینه‌های مجاز / Allowed options؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** reorder؛ aggregate same SKU؛ simulate each combination; publish impact.

**9. اعتبارسنجی:** components mandatory؛ positive integers؛ discount valid؛ allowed SKU actual؛ no nested bundle در نسخه جاری؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no components؛ unavailable combo؛ missing costs؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: component cards + summary؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** components، eligible variants، prices، cost extras، stacking flag؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-06: repeated SKU aggregate؛ اختیار مشتری محدود؛ cost extra once؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-08 — فرم پکیج / Bundle Editor
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: تعریف اجزا و گزینه مجاز
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/bundles/:id/edit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: name/media/fa-en/collections؛ component picker product/required quantity/allowed SKU؛ discount fixed/percent؛ package cost/BOM؛ stacking exception؛ preview.
کامپوننت‌ها و CTA: اجزای اختصاصی: name/media/fa-en/collections؛ component picker product/required quantity/allowed SKU؛ discount fixed/percent؛ package cost/BOM؛ stacking exception؛ preview. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اجزای پکیج / Bundle components؛ گزینه‌های مجاز / Allowed options؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: reorder؛ aggregate same SKU؛ simulate each combination; publish impact.
اعتبارسنجی: components mandatory؛ positive integers؛ discount valid؛ allowed SKU actual؛ no nested bundle در نسخه جاری؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no components؛ unavailable combo؛ missing costs؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: component cards + summary؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: components، eligible variants، prices، cost extras، stacking flag؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-06: repeated SKU aggregate؛ اختیار مشتری محدود؛ cost extra once؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-09"></a>

### ADM-09 — کدهای تخفیف / Discounts Admin

**1. نام و شناسه:** ADM-09 — کدهای تخفیف / Discounts Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** کنترل promotion

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/discounts`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list/filter active/scheduled/expired؛ code؛ usage/reserved/consumed؛ new/edit؛ deactivate.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list/filter active/scheduled/expired؛ code؛ usage/reserved/consumed؛ new/edit؛ deactivate. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** کد تخفیف / Discount code؛ مصرف قطعی / Confirmed uses؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** detail usage؛ duplicate draft؛ deactivate confirmation.

**9. اعتبارسنجی:** code unique؛ date range؛ no destructive delete used code؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ max use؛ scope invalid.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** discount definitions، redemption stats؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** reservation از confirmed use تفکیک؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-09 — کدهای تخفیف / Discounts Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: کنترل promotion
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/discounts. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list/filter active/scheduled/expired؛ code؛ usage/reserved/consumed؛ new/edit؛ deactivate.
کامپوننت‌ها و CTA: اجزای اختصاصی: list/filter active/scheduled/expired؛ code؛ usage/reserved/consumed؛ new/edit؛ deactivate. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: کد تخفیف / Discount code؛ مصرف قطعی / Confirmed uses؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: detail usage؛ duplicate draft؛ deactivate confirmation.
اعتبارسنجی: code unique؛ date range؛ no destructive delete used code؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ max use؛ scope invalid.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: discount definitions، redemption stats؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: reservation از confirmed use تفکیک؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-10"></a>

### ADM-10 — فرم کد تخفیف / Discount Editor

**1. نام و شناسه:** ADM-10 — فرم کد تخفیف / Discount Editor

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** تعریف قواعد تخفیف

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/discounts/:id/edit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** code/type/value/max؛ min spend؛ dates؛ overall/per-user limits؛ category/collection/product scopes؛ user rules؛ bundle stacking؛ simulator cart.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: code/type/value/max؛ min spend؛ dates؛ overall/per-user limits؛ category/collection/product scopes؛ user rules؛ bundle stacking؛ simulator cart. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** حداقل خرید واجد شرایط / Minimum eligible spend؛ جمع با تخفیف پکیج / Combine with bundle discount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** preview eligible/ineligible rows؛ apply after bundle reduction؛ save/activate.

**9. اعتبارسنجی:** percent range؛ fixed<=eligible via cap؛ start<end؛ positive limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: duplicate؛ no eligible rows؛ mixed-cart sample success.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form sections collapsed؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** discount rules، simulation lines؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-07: ارسال/مالیات مستثنا؛ پکیج پیش‌فرض بدون جمع، مستقل‌ها مشمول؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-10 — فرم کد تخفیف / Discount Editor
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: تعریف قواعد تخفیف
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/discounts/:id/edit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: code/type/value/max؛ min spend؛ dates؛ overall/per-user limits؛ category/collection/product scopes؛ user rules؛ bundle stacking؛ simulator cart.
کامپوننت‌ها و CTA: اجزای اختصاصی: code/type/value/max؛ min spend؛ dates؛ overall/per-user limits؛ category/collection/product scopes؛ user rules؛ bundle stacking؛ simulator cart. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: حداقل خرید واجد شرایط / Minimum eligible spend؛ جمع با تخفیف پکیج / Combine with bundle discount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: preview eligible/ineligible rows؛ apply after bundle reduction؛ save/activate.
اعتبارسنجی: percent range؛ fixed<=eligible via cap؛ start<end؛ positive limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: duplicate؛ no eligible rows؛ mixed-cart sample success.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form sections collapsed؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: discount rules، simulation lines؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-07: ارسال/مالیات مستثنا؛ پکیج پیش‌فرض بدون جمع، مستقل‌ها مشمول؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-11"></a>

### ADM-11 — رسانه و فایل چاپ / Media Library

**1. نام و شناسه:** ADM-11 — رسانه و فایل چاپ / Media Library

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** کنترل فایل عمومی/خصوصی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/media`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs public/print/reference؛ thumbnail/table؛ filters collection/SKU/size/version؛ upload؛ access badge؛ replace/archive.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs public/print/reference؛ thumbnail/table؛ filters collection/SKU/size/version؛ upload؛ access badge؛ replace/archive. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** فایل چاپ خصوصی / Private print file؛ تصویر عمومی / Public image؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** upload destination role explicit؛ compare versions؛ associate SKU; public preview separate.

**9. اعتبارسنجی:** format/resolution/size config؛ private cannot public silently؛ manifest mismatch warning؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: partial upload؛ unknown size؛ missing asset؛ processed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards + file info sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** assets، usage links، permissions، metadata؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-20: downloadable private only authorized؛ public compression original را خراب نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-11 — رسانه و فایل چاپ / Media Library
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: کنترل فایل عمومی/خصوصی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/media. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs public/print/reference؛ thumbnail/table؛ filters collection/SKU/size/version؛ upload؛ access badge؛ replace/archive.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs public/print/reference؛ thumbnail/table؛ filters collection/SKU/size/version؛ upload؛ access badge؛ replace/archive. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: فایل چاپ خصوصی / Private print file؛ تصویر عمومی / Public image؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: upload destination role explicit؛ compare versions؛ associate SKU; public preview separate.
اعتبارسنجی: format/resolution/size config؛ private cannot public silently؛ manifest mismatch warning؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: partial upload؛ unknown size؛ missing asset؛ processed.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards + file info sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: assets، usage links، permissions، metadata؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-20: downloadable private only authorized؛ public compression original را خراب نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-12"></a>

### ADM-12 — آثار نقاشی / Artwork Admin

**1. نام و شناسه:** ADM-12 — آثار نقاشی / Artwork Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** مدیریت اثر اصل/چاپ/دیجیتال

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/artworks`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list edition/artist/status؛ form technique/dimensions/authenticity/media/price؛ stock link؛ license.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list edition/artist/status؛ form technique/dimensions/authenticity/media/price؛ stock link؛ license. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اصل و نسخه / Originals and editions؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** original unique SKU؛ print links product؛ publish checklist.

**9. اعتبارسنجی:** edition clear؛ originals stock via ledger؛ permissions؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: sold original؛ missing certificate info؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: editor stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** art records، SKU، artists، licenses؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** موجودی اصل با چاپ یکی نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-12 — آثار نقاشی / Artwork Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: مدیریت اثر اصل/چاپ/دیجیتال
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/artworks. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list edition/artist/status؛ form technique/dimensions/authenticity/media/price؛ stock link؛ license.
کامپوننت‌ها و CTA: اجزای اختصاصی: list edition/artist/status؛ form technique/dimensions/authenticity/media/price؛ stock link؛ license. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اصل و نسخه / Originals and editions؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: original unique SKU؛ print links product؛ publish checklist.
اعتبارسنجی: edition clear؛ originals stock via ledger؛ permissions؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: sold original؛ missing certificate info؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: editor stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: art records، SKU، artists، licenses؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: موجودی اصل با چاپ یکی نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-13"></a>

### ADM-13 — کاربران و دسترسی / Users & Roles

**1. نام و شناسه:** ADM-13 — کاربران و دسترسی / Users & Roles

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** مدیریت نقش‌های مستقل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/users`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** search users/status؛ detail؛ permissions matrix catalog/inventory/pricing/finance/refund؛ suspend/restore؛ audit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: search users/status؛ detail؛ permissions matrix catalog/inventory/pricing/finance/refund؛ suspend/restore؛ audit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نقش‌ها و دسترسی‌ها / Roles and permissions؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** change role confirm؛ blocked context؛ owner last admin safeguard.

**9. اعتبارسنجی:** actor permission؛ reason sensitive changes؛ جلوگیری حذف تنها owner؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no results؛ permission denied؛ save conflict.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: matrix scroll and role cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** users، roles، granular permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** مسئول انبار بدون مجوز قیمت را منتشر نکند؛ مالی مجوز مستقل refund؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-13 — کاربران و دسترسی / Users & Roles
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: مدیریت نقش‌های مستقل
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/users. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: search users/status؛ detail؛ permissions matrix catalog/inventory/pricing/finance/refund؛ suspend/restore؛ audit.
کامپوننت‌ها و CTA: اجزای اختصاصی: search users/status؛ detail؛ permissions matrix catalog/inventory/pricing/finance/refund؛ suspend/restore؛ audit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نقش‌ها و دسترسی‌ها / Roles and permissions؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: change role confirm؛ blocked context؛ owner last admin safeguard.
اعتبارسنجی: actor permission؛ reason sensitive changes؛ جلوگیری حذف تنها owner؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no results؛ permission denied؛ save conflict.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: matrix scroll and role cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: users، roles، granular permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: مسئول انبار بدون مجوز قیمت را منتشر نکند؛ مالی مجوز مستقل refund؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-14"></a>

### ADM-14 — هنرمندان / Artists Admin

**1. نام و شناسه:** ADM-14 — هنرمندان / Artists Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** معرفی و تخصیص سفارش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/artists`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list availability/workload؛ profile/portfolio؛ assignments؛ deadlines؛ approve/suspend.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list availability/workload؛ profile/portfolio؛ assignments؛ deadlines؛ approve/suspend. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** هنرمندان / Artists؛ تخصیص سفارش / Assign order؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** assign available artist؛ workload preview؛ portfolio consent.

**9. اعتبارسنجی:** approved profile for publication؛ permissions؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no artists؛ overloaded warning؛ assigned.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** artists، workload، portfolio approvals؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** تخصیص به حساب معتبر و تاریخچه محفوظ؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-14 — هنرمندان / Artists Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: معرفی و تخصیص سفارش
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/artists. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list availability/workload؛ profile/portfolio؛ assignments؛ deadlines؛ approve/suspend.
کامپوننت‌ها و CTA: اجزای اختصاصی: list availability/workload؛ profile/portfolio؛ assignments؛ deadlines؛ approve/suspend. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: هنرمندان / Artists؛ تخصیص سفارش / Assign order؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: assign available artist؛ workload preview؛ portfolio consent.
اعتبارسنجی: approved profile for publication؛ permissions؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no artists؛ overloaded warning؛ assigned.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: artists، workload، portfolio approvals؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: تخصیص به حساب معتبر و تاریخچه محفوظ؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-15"></a>

### ADM-15 — محتوا و پشتیبانی / Content Admin

**1. نام و شناسه:** ADM-15 — محتوا و پشتیبانی / Content Admin

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** مدیریت متن دو‌زبانه فروشگاه

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/content`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** content list home/about/contact/FAQ/guides/policies؛ version editor fa/en؛ preview؛ publish.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: content list home/about/contact/FAQ/guides/policies؛ version editor fa/en؛ preview؛ publish. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** محتوای سایت / Site content؛ نسخه قوانین / Policy version؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** policy version retained checkout؛ FAQ order؛ contact validated.

**9. اعتبارسنجی:** translations before publish؛ slug؛ broken link check؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing translation؛ empty content؛ published.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: editor single-column؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** content versions، locale completeness؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** مدت مرجوعی/تعداد اصلاح از متن ساختگی نیاید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-15 — محتوا و پشتیبانی / Content Admin
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: مدیریت متن دو‌زبانه فروشگاه
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/content. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: content list home/about/contact/FAQ/guides/policies؛ version editor fa/en؛ preview؛ publish.
کامپوننت‌ها و CTA: اجزای اختصاصی: content list home/about/contact/FAQ/guides/policies؛ version editor fa/en؛ preview؛ publish. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: محتوای سایت / Site content؛ نسخه قوانین / Policy version؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: policy version retained checkout؛ FAQ order؛ contact validated.
اعتبارسنجی: translations before publish؛ slug؛ broken link check؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing translation؛ empty content؛ published.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: editor single-column؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: content versions، locale completeness؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: مدت مرجوعی/تعداد اصلاح از متن ساختگی نیاید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="adm-16"></a>

### ADM-16 — تنظیمات کسب‌وکار / Business Settings

**1. نام و شناسه:** ADM-16 — تنظیمات کسب‌وکار / Business Settings

**2. نقش و دسترسی:** ادمین با مجوز همان بخش

**3. هدف:** تنظیم زیرساخت فروش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/settings`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** sections locale/currency/tax/shipping/payment/reservation/upload/revisions/notifications؛ permission-aware fields.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: sections locale/currency/tax/shipping/payment/reservation/upload/revisions/notifications؛ permission-aware fields. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تنظیمات فروشگاه / Store settings؛ تبدیل تومان به ریال / Toman-to-rial conversion؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** save impact review؛ secrets masked؛ test connection بدون افشای کلید.

**9. اعتبارسنجی:** currency conversion explicit؛ required operational config؛ server limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: unsaved؛ integration offline؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: sections vertical؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** settings، integrations state، configuration versions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** مقدار margin پیش‌فرض فرضی ندارد؛ shipping rule قابل مشاهده؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ADM-16 — تنظیمات کسب‌وکار / Business Settings
نقش و دسترسی: ادمین با مجوز همان بخش
هدف: تنظیم زیرساخت فروش
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/settings. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: sections locale/currency/tax/shipping/payment/reservation/upload/revisions/notifications؛ permission-aware fields.
کامپوننت‌ها و CTA: اجزای اختصاصی: sections locale/currency/tax/shipping/payment/reservation/upload/revisions/notifications؛ permission-aware fields. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تنظیمات فروشگاه / Store settings؛ تبدیل تومان به ریال / Toman-to-rial conversion؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: save impact review؛ secrets masked؛ test connection بدون افشای کلید.
اعتبارسنجی: currency conversion explicit؛ required operational config؛ server limits؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: unsaved؛ integration offline؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: sections vertical؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: settings، integrations state، configuration versions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: مقدار margin پیش‌فرض فرضی ندارد؛ shipping rule قابل مشاهده؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۰. پنل ادمین: هزینه‌یابی و قیمت

<a id="cost-01"></a>

### COST-01 — فهرست مواد / Materials

**1. نام و شناسه:** COST-01 — فهرست مواد / Materials

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** مدیریت منابع ساخت

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/materials`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** search/filter role/gsm/supplier؛ table name/base unit/purchase unit/latest replacement rate/weighted cost/stock؛ new/edit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: search/filter role/gsm/supplier؛ table name/base unit/purchase unit/latest replacement rate/weighted cost/stock؛ new/edit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مواد اولیه / Materials؛ نرخ جایگزینی / Replacement rate؛ هزینه میانگین انبار / Average stock cost؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** نرخ برآوردی و متوسط واقعی ستون جدا؛ linked BOMs؛ opening links.

**9. اعتبارسنجی:** permissions؛ ماده مصرف‌شده archive نه delete؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ missing rate —؛ low stock؛ imported pending approval.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: columns مهم cards بقیه detail؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** materials، units، suppliers، rate history، stock؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** cost null صفر نشود؛ نرخ روز ارزش انبار را تغییر ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-01 — فهرست مواد / Materials
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: مدیریت منابع ساخت
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/materials. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: search/filter role/gsm/supplier؛ table name/base unit/purchase unit/latest replacement rate/weighted cost/stock؛ new/edit.
کامپوننت‌ها و CTA: اجزای اختصاصی: search/filter role/gsm/supplier؛ table name/base unit/purchase unit/latest replacement rate/weighted cost/stock؛ new/edit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مواد اولیه / Materials؛ نرخ جایگزینی / Replacement rate؛ هزینه میانگین انبار / Average stock cost؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: نرخ برآوردی و متوسط واقعی ستون جدا؛ linked BOMs؛ opening links.
اعتبارسنجی: permissions؛ ماده مصرف‌شده archive نه delete؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ missing rate —؛ low stock؛ imported pending approval.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: columns مهم cards بقیه detail؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: materials، units، suppliers، rate history، stock؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: cost null صفر نشود؛ نرخ روز ارزش انبار را تغییر ندهد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-02"></a>

### COST-02 — تعریف ماده و تبدیل واحد / Material Editor

**1. نام و شناسه:** COST-02 — تعریف ماده و تبدیل واحد / Material Editor

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** تعریف واحد خرید و مصرف

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/materials/:id/edit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** name/gsm/width/height؛ base/purchase unit؛ sheets per pack؛ supplier/min order؛ replacement rate/effective date؛ links.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: name/gsm/width/height؛ base/purchase unit؛ sheets per pack؛ supplier/min order؛ replacement rate/effective date؛ links. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** واحد خرید / Purchase unit؛ واحد مصرف / Consumption unit؛ تعداد ورق در بسته / Sheets per pack؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** preview price per mother sheet؛ تغییر conversion اثر وابسته‌ها؛ ثبت نرخ به صف.

**9. اعتبارسنجی:** positive pack count/dimensions؛ rate unknown vs explicit zero؛ conversion consistent؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: invalid conversion؛ conflicting source؛ saved awaiting pricing review.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: grouped form + calculator bottom؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** material specs، conversion، rate version، source؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-13: خرید کامل با مصرف جدا؛ filename/source price نیاز تأیید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-02 — تعریف ماده و تبدیل واحد / Material Editor
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: تعریف واحد خرید و مصرف
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/materials/:id/edit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: name/gsm/width/height؛ base/purchase unit؛ sheets per pack؛ supplier/min order؛ replacement rate/effective date؛ links.
کامپوننت‌ها و CTA: اجزای اختصاصی: name/gsm/width/height؛ base/purchase unit؛ sheets per pack؛ supplier/min order؛ replacement rate/effective date؛ links. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: واحد خرید / Purchase unit؛ واحد مصرف / Consumption unit؛ تعداد ورق در بسته / Sheets per pack؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: preview price per mother sheet؛ تغییر conversion اثر وابسته‌ها؛ ثبت نرخ به صف.
اعتبارسنجی: positive pack count/dimensions؛ rate unknown vs explicit zero؛ conversion consistent؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: invalid conversion؛ conflicting source؛ saved awaiting pricing review.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: grouped form + calculator bottom؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: material specs، conversion، rate version، source؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-13: خرید کامل با مصرف جدا؛ filename/source price نیاز تأیید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-03"></a>

### COST-03 — نرخ خدمات / Service Rates

**1. نام و شناسه:** COST-03 — نرخ خدمات / Service Rates

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** تعریف چاپ، صحافی و هزینه ریز

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/service-rates`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** table service/basis/rate/date/supplier؛ new form; basis sheet/printed side/book/batch/order؛ tiers by size/thickness.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: table service/basis/rate/date/supplier؛ new form; basis sheet/printed side/book/batch/order؛ tiers by size/thickness. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نرخ چاپ هر روی کاغذ / Print cost per side؛ نرخ چاپ دوروی هر برگ / Double-sided cost per sheet؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** front/back rates جدا؛ print two-sided per sheet explicitly؛ rate history/affected.

**9. اعتبارسنجی:** basis required؛ nonnegative; unknown distinct؛ valid tier ranges؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no rates؛ overlapping tiers؛ unknown cost.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards + edit sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** service types، rates، tiers، effective dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-12: نرخ دورو دوباره ×۲ نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-03 — نرخ خدمات / Service Rates
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: تعریف چاپ، صحافی و هزینه ریز
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/service-rates. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: table service/basis/rate/date/supplier؛ new form; basis sheet/printed side/book/batch/order؛ tiers by size/thickness.
کامپوننت‌ها و CTA: اجزای اختصاصی: table service/basis/rate/date/supplier؛ new form; basis sheet/printed side/book/batch/order؛ tiers by size/thickness. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نرخ چاپ هر روی کاغذ / Print cost per side؛ نرخ چاپ دوروی هر برگ / Double-sided cost per sheet؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: front/back rates جدا؛ print two-sided per sheet explicitly؛ rate history/affected.
اعتبارسنجی: basis required؛ nonnegative; unknown distinct؛ valid tier ranges؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no rates؛ overlapping tiers؛ unknown cost.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards + edit sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: service types، rates، tiers، effective dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-12: نرخ دورو دوباره ×۲ نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-04"></a>

### COST-04 — فرمول‌های ساخت / BOM Library

**1. نام و شناسه:** COST-04 — فرمول‌های ساخت / BOM Library

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** استفاده مجدد و نسخه‌بندی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/boms`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** family/template list؛ version/date/status/SKU count؛ clone draft؛ history؛ edit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: family/template list؛ version/date/status/SKU count؛ clone draft؛ history؛ edit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** فرمول ساخت / Bill of materials؛ نسخه ساخت / BOM version؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** clone without replacing running batch؛ publish new version impact.

**9. اعتبارسنجی:** linked SKU permissions؛ immutable released version؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty start؛ missing assignment؛ version archived.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: list cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** BOM templates، assignments، version history؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** بچ در حال تولید به نسخه قبلی ثابت بماند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-04 — فرمول‌های ساخت / BOM Library
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: استفاده مجدد و نسخه‌بندی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/boms. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: family/template list؛ version/date/status/SKU count؛ clone draft؛ history؛ edit.
کامپوننت‌ها و CTA: اجزای اختصاصی: family/template list؛ version/date/status/SKU count؛ clone draft؛ history؛ edit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: فرمول ساخت / Bill of materials؛ نسخه ساخت / BOM version؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: clone without replacing running batch؛ publish new version impact.
اعتبارسنجی: linked SKU permissions؛ immutable released version؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty start؛ missing assignment؛ version archived.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: list cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: BOM templates، assignments، version history؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: بچ در حال تولید به نسخه قبلی ثابت بماند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-05"></a>

### COST-05 — ویرایش فرمول ساخت / BOM Editor

**1. نام و شناسه:** COST-05 — ویرایش فرمول ساخت / BOM Editor

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** تعریف مقدار و مبنای هزینه هر SKU

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/boms/:id/edit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** params size/sheets/cover/print؛ rows interior paper/front-back boards/cover print/internal print/binding/per-sheet extras/cutting/packaging/overhead؛ per-row unit/basis/source؛ total؛ version reason.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: params size/sheets/cover/print؛ rows interior paper/front-back boards/cover print/internal print/binding/per-sheet extras/cutting/packaging/overhead؛ per-row unit/basis/source؛ total؛ version reason. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مواد و خدمات مصرفی / Materials and services used؛ هزینه ضروری نامشخص / Required cost unknown؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** row add/reorder؛ simulate SKU؛ per-variant override؛ new version preview affected.

**9. اعتبارسنجی:** required unknown blocked valid quote؛ nonzero yield؛ waste<100%; no duplicate inadvertent cost؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing material/rate؛ unit mismatch؛ invalid params؛ saved draft.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: rows as expandable cards; save footer؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** BOM version، parameters، service/material rates، overrides؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** همه اجزای دفتر طبق PRD؛ هزینه ارسال order در BOM محصول نیاید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-05 — ویرایش فرمول ساخت / BOM Editor
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: تعریف مقدار و مبنای هزینه هر SKU
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/boms/:id/edit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: params size/sheets/cover/print؛ rows interior paper/front-back boards/cover print/internal print/binding/per-sheet extras/cutting/packaging/overhead؛ per-row unit/basis/source؛ total؛ version reason.
کامپوننت‌ها و CTA: اجزای اختصاصی: params size/sheets/cover/print؛ rows interior paper/front-back boards/cover print/internal print/binding/per-sheet extras/cutting/packaging/overhead؛ per-row unit/basis/source؛ total؛ version reason. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مواد و خدمات مصرفی / Materials and services used؛ هزینه ضروری نامشخص / Required cost unknown؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: row add/reorder؛ simulate SKU؛ per-variant override؛ new version preview affected.
اعتبارسنجی: required unknown blocked valid quote؛ nonzero yield؛ waste<100%; no duplicate inadvertent cost؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing material/rate؛ unit mismatch؛ invalid params؛ saved draft.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: rows as expandable cards; save footer؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: BOM version، parameters، service/material rates، overrides؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: همه اجزای دفتر طبق PRD؛ هزینه ارسال order در BOM محصول نیاید؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-06"></a>

### COST-06 — بازده برش و ضایعات / Cutting Yield

**1. نام و شناسه:** COST-06 — بازده برش و ضایعات / Cutting Yield

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** تأیید مصرف ورق مادر

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/costing/cutting`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** mother dimensions؛ cut size/margins/grain direction؛ orientation diagrams؛ grid yield؛ waste؛ usable pieces؛ cost per piece.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: mother dimensions؛ cut size/margins/grain direction؛ orientation diagrams؛ grid yield؛ waste؛ usable pieces؛ cost per piece. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** بازده برش / Cutting yield؛ جهت الیاف / Grain direction؛ ضایعات اضافه / Additional waste؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** switch orientation only allowed؛ manual workshop-approved yield with reason؛ preview cover oversize.

**9. اعتبارسنجی:** positive dims/yield؛ margins feasible؛ waste<100%; direction constraints؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no feasible cut؛ unknown grain warning؛ confirmed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: diagram zoom و inputs stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** sheet specs، cut geometry، constraints، approved yield؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** چیدمان پیشنهادی با تأیید کارگاه؛ برگ فیزیکی از page count حدس نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-06 — بازده برش و ضایعات / Cutting Yield
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: تأیید مصرف ورق مادر
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/costing/cutting. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: mother dimensions؛ cut size/margins/grain direction؛ orientation diagrams؛ grid yield؛ waste؛ usable pieces؛ cost per piece.
کامپوننت‌ها و CTA: اجزای اختصاصی: mother dimensions؛ cut size/margins/grain direction؛ orientation diagrams؛ grid yield؛ waste؛ usable pieces؛ cost per piece. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: بازده برش / Cutting yield؛ جهت الیاف / Grain direction؛ ضایعات اضافه / Additional waste؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: switch orientation only allowed؛ manual workshop-approved yield with reason؛ preview cover oversize.
اعتبارسنجی: positive dims/yield؛ margins feasible؛ waste<100%; direction constraints؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no feasible cut؛ unknown grain warning؛ confirmed.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: diagram zoom و inputs stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: sheet specs، cut geometry، constraints، approved yield؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: چیدمان پیشنهادی با تأیید کارگاه؛ برگ فیزیکی از page count حدس نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-07"></a>

### COST-07 — محاسبه‌گر هزینه SKU / SKU Cost Calculator

**1. نام و شناسه:** COST-07 — محاسبه‌گر هزینه SKU / SKU Cost Calculator

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** مشاهده مصرف و هزینه برآوردی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/costing`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** product/SKU selector؛ size/sheets/print read-only selected; batch quantity؛ breakdown materials/services/packaging/overhead؛ unknown list؛ consumption vs required purchase; history.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: product/SKU selector؛ size/sheets/print read-only selected; batch quantity؛ breakdown materials/services/packaging/overhead؛ unknown list؛ consumption vs required purchase; history. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** هزینه مصرف / Consumption cost؛ مبلغ خرید بسته کامل / Full-pack purchase outlay؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** simulate without stock mutation؛ compare sizes؛ jump missing rate؛ timestamp.

**9. اعتبارسنجی:** SKU/BOM valid؛ batch output positive؛ zero explicit; units consistent؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: incomplete blocks quote؛ no BOM؛ stale estimate؛ calculated.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: breakdown cards and comparison scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** params، BOM/rates versions، yields، pack rounding، estimate؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-11/12/13: sheet/side/two-sided labels؛ باقی مواد موجودی نه expense؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-07 — محاسبه‌گر هزینه SKU / SKU Cost Calculator
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: مشاهده مصرف و هزینه برآوردی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/costing. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: product/SKU selector؛ size/sheets/print read-only selected; batch quantity؛ breakdown materials/services/packaging/overhead؛ unknown list؛ consumption vs required purchase; history.
کامپوننت‌ها و CTA: اجزای اختصاصی: product/SKU selector؛ size/sheets/print read-only selected; batch quantity؛ breakdown materials/services/packaging/overhead؛ unknown list؛ consumption vs required purchase; history. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: هزینه مصرف / Consumption cost؛ مبلغ خرید بسته کامل / Full-pack purchase outlay؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: simulate without stock mutation؛ compare sizes؛ jump missing rate؛ timestamp.
اعتبارسنجی: SKU/BOM valid؛ batch output positive؛ zero explicit; units consistent؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: incomplete blocks quote؛ no BOM؛ stale estimate؛ calculated.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: breakdown cards and comparison scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: params، BOM/rates versions، yields، pack rounding، estimate؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-11/12/13: sheet/side/two-sided labels؛ باقی مواد موجودی نه expense؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-08"></a>

### COST-08 — قیمت پیشنهادی SKU / Price Proposal

**1. نام و شناسه:** COST-08 — قیمت پیشنهادی SKU / Price Proposal

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** محاسبه قیمت با حاشیه سود هدف

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/pricing/:sku`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** four price types cards؛ C/m/f controls؛ formula P=C/(1-m-f) LTR؛ cost breakdown؛ rounding؛ proposed/custom price؛ actual margin؛ public preview.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: four price types cards؛ C/m/f controls؛ formula P=C/(1-m-f) LTR؛ cost breakdown؛ rounding؛ proposed/custom price؛ actual margin؛ public preview. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** حاشیه سود هدف / Target profit margin؛ قیمت پیشنهادی / Suggested price؛ قیمت منتشرشده / Published price؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** m بدون default فرضی؛ manual price اثر را update؛ proposal save نه publish؛ discount simulation.

**9. اعتبارسنجی:** m,f>=0; sum<1؛ cost complete؛ precision/currency explicit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing margin؛ invalid denominator؛ stale version؛ proposal saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: formula scroll-free؛ comparison stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** cost snapshot، fixed/percentage fees، target، rounding، current price؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-16: مثال ۱۰۰هزار/۲۵٪≈۱۳۳۳۳۳ فقط آموزشی؛ مالیات/حمل خارج؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-08 — قیمت پیشنهادی SKU / Price Proposal
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: محاسبه قیمت با حاشیه سود هدف
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/pricing/:sku. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: four price types cards؛ C/m/f controls؛ formula P=C/(1-m-f) LTR؛ cost breakdown؛ rounding؛ proposed/custom price؛ actual margin؛ public preview.
کامپوننت‌ها و CTA: اجزای اختصاصی: four price types cards؛ C/m/f controls؛ formula P=C/(1-m-f) LTR؛ cost breakdown؛ rounding؛ proposed/custom price؛ actual margin؛ public preview. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: حاشیه سود هدف / Target profit margin؛ قیمت پیشنهادی / Suggested price؛ قیمت منتشرشده / Published price؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: m بدون default فرضی؛ manual price اثر را update؛ proposal save نه publish؛ discount simulation.
اعتبارسنجی: m,f>=0; sum<1؛ cost complete؛ precision/currency explicit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing margin؛ invalid denominator؛ stale version؛ proposal saved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: formula scroll-free؛ comparison stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: cost snapshot، fixed/percentage fees، target، rounding، current price؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-16: مثال ۱۰۰هزار/۲۵٪≈۱۳۳۳۳۳ فقط آموزشی؛ مالیات/حمل خارج؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-09"></a>

### COST-09 — صف بازبینی قیمت / Price Review Queue

**1. نام و شناسه:** COST-09 — صف بازبینی قیمت / Price Review Queue

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** رسیدگی به اثر تغییر نرخ

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/pricing/reviews`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** alert count؛ filters cause/material/status؛ table SKU/bundle/old-new cost/current price/current margin/proposed/delta/version؛ bulk select؛ action.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: alert count؛ filters cause/material/status؛ table SKU/bundle/old-new cost/current price/current margin/proposed/delta/version؛ bulk select؛ action. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نیازمند بازبینی قیمت / Price review required؛ قیمت عمومی تغییر نکرده / Public prices have not changed؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** only affected dependencies؛ exclude incomplete from publish؛ reject reason؛ recalc stale؛ keep until decision.

**9. اعتبارسنجی:** selection fresh؛ actor permission؛ no unrelated SKU؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty up-to-date؛ incomplete؛ superseded؛ group partial failure.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table horizontal with summary cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** dependency impact، snapshots، statuses، versions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-10: نرخ جدید public را عوض نکند؛ dependent bundles shown؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-09 — صف بازبینی قیمت / Price Review Queue
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: رسیدگی به اثر تغییر نرخ
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/pricing/reviews. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: alert count؛ filters cause/material/status؛ table SKU/bundle/old-new cost/current price/current margin/proposed/delta/version؛ bulk select؛ action.
کامپوننت‌ها و CTA: اجزای اختصاصی: alert count؛ filters cause/material/status؛ table SKU/bundle/old-new cost/current price/current margin/proposed/delta/version؛ bulk select؛ action. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نیازمند بازبینی قیمت / Price review required؛ قیمت عمومی تغییر نکرده / Public prices have not changed؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: only affected dependencies؛ exclude incomplete from publish؛ reject reason؛ recalc stale؛ keep until decision.
اعتبارسنجی: selection fresh؛ actor permission؛ no unrelated SKU؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty up-to-date؛ incomplete؛ superseded؛ group partial failure.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table horizontal with summary cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: dependency impact، snapshots، statuses، versions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-10: نرخ جدید public را عوض نکند؛ dependent bundles shown؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="cost-10"></a>

### COST-10 — تأیید انتشار و تاریخچه / Price Publication

**1. نام و شناسه:** COST-10 — تأیید انتشار و تاریخچه / Price Publication

**2. نقش و دسترسی:** ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت

**3. هدف:** تصمیم تکی/گروهی قابل بررسی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/pricing/reviews/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** old/new comparisons؛ bundle cascade effect؛ selected final prices؛ excluded items؛ reject reason؛ confirm publish؛ audit timeline.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: old/new comparisons؛ bundle cascade effect؛ selected final prices؛ excluded items؛ reject reason؛ confirm publish؛ audit timeline. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تأیید انتشار قیمت / Confirm price publication؛ رد با دلیل / Reject with a reason؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** publish explicit؛ stale inputs require recalc؛ batch summary and results؛ reject clears until new event.

**9. اعتبارسنجی:** margin warning not silent block؛ permission؛ all proposals fresh؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: conflict؛ publication failed unchanged؛ success per row؛ no selection.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: preview compare vertical and confirmation sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** final price decisions، related bundles، actor/time/reason؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-15: old orders immutable؛ history reflects decision not just calculation؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: COST-10 — تأیید انتشار و تاریخچه / Price Publication
نقش و دسترسی: ادمین/مسئول هزینه با مجوز؛ انتشار فقط دارنده مجوز قیمت
هدف: تصمیم تکی/گروهی قابل بررسی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/pricing/reviews/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: old/new comparisons؛ bundle cascade effect؛ selected final prices؛ excluded items؛ reject reason؛ confirm publish؛ audit timeline.
کامپوننت‌ها و CTA: اجزای اختصاصی: old/new comparisons؛ bundle cascade effect؛ selected final prices؛ excluded items؛ reject reason؛ confirm publish؛ audit timeline. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تأیید انتشار قیمت / Confirm price publication؛ رد با دلیل / Reject with a reason؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: publish explicit؛ stale inputs require recalc؛ batch summary and results؛ reject clears until new event.
اعتبارسنجی: margin warning not silent block؛ permission؛ all proposals fresh؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: conflict؛ publication failed unchanged؛ success per row؛ no selection.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: preview compare vertical and confirmation sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: final price decisions، related bundles، actor/time/reason؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-15: old orders immutable؛ history reflects decision not just calculation؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۱. پنل ادمین: خرید، انبار و تولید

<a id="ops-01"></a>

### OPS-01 — نمای انبار / Inventory

**1. نام و شناسه:** OPS-01 — نمای انبار / Inventory

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** مشاهده مواد و محصول آماده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/inventory`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs materials/finished goods؛ filter؛ counts on-hand/reserved/available؛ average value؛ threshold؛ movement link.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs materials/finished goods؛ filter؛ counts on-hand/reserved/available؛ average value؛ threshold؛ movement link. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** موجودی قابل فروش / Available stock؛ موجودی رزروشده / Reserved stock؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** شروع تولید/receipt links؛ no inline absolute edits.

**9. اعتبارسنجی:** available derived؛ role filters؛ unit shown؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty opening CTA؛ low/negative anomaly alert.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: key fields cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** stock balances، reservations، cost، thresholds؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-05: available = on hand minus reservations؛ WIP not for sale؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-01 — نمای انبار / Inventory
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: مشاهده مواد و محصول آماده
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/inventory. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs materials/finished goods؛ filter؛ counts on-hand/reserved/available؛ average value؛ threshold؛ movement link.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs materials/finished goods؛ filter؛ counts on-hand/reserved/available؛ average value؛ threshold؛ movement link. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: موجودی قابل فروش / Available stock؛ موجودی رزروشده / Reserved stock؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: شروع تولید/receipt links؛ no inline absolute edits.
اعتبارسنجی: available derived؛ role filters؛ unit shown؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty opening CTA؛ low/negative anomaly alert.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: key fields cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: stock balances، reservations، cost، thresholds؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-05: available = on hand minus reservations؛ WIP not for sale؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-02"></a>

### OPS-02 — گردش و رزرو موجودی / Stock Ledger

**1. نام و شناسه:** OPS-02 — گردش و رزرو موجودی / Stock Ledger

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ردیابی علت تغییر

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/inventory/:item/movements`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** balance header؛ movement table date/type/qty/value/batch/source؛ reservations expiry/state؛ filters.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: balance header؛ movement table date/type/qty/value/batch/source؛ reservations expiry/state؛ filters. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** گردش موجودی / Stock movements؛ رزرو زمان‌دار / Timed reservation؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** source document deep links؛ reservation cancellation فقط مجاز با reconciliation.

**9. اعتبارسنجی:** immutable rows؛ units same؛ no silent release unknown payment؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no movement؛ stuck reservation؛ source missing error.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: timeline/cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** movements، reservation refs، payment status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-08/09: unknown reconcile؛ duplicate callback no duplicate movement؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-02 — گردش و رزرو موجودی / Stock Ledger
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ردیابی علت تغییر
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/inventory/:item/movements. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: balance header؛ movement table date/type/qty/value/batch/source؛ reservations expiry/state؛ filters.
کامپوننت‌ها و CTA: اجزای اختصاصی: balance header؛ movement table date/type/qty/value/batch/source؛ reservations expiry/state؛ filters. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: گردش موجودی / Stock movements؛ رزرو زمان‌دار / Timed reservation؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: source document deep links؛ reservation cancellation فقط مجاز با reconciliation.
اعتبارسنجی: immutable rows؛ units same؛ no silent release unknown payment؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no movement؛ stuck reservation؛ source missing error.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: timeline/cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: movements، reservation refs، payment status؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-08/09: unknown reconcile؛ duplicate callback no duplicate movement؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-03"></a>

### OPS-03 — موجودی افتتاحیه و اصلاح / Stock Adjustment

**1. نام و شناسه:** OPS-03 — موجودی افتتاحیه و اصلاح / Stock Adjustment

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ثبت اختلاف با سند

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/inventory/adjustments/new`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** type opening/count discrepancy/damage؛ item/qty/base unit/value if needed؛ date/reason/evidence؛ impact؛ confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: type opening/count discrepancy/damage؛ item/qty/base unit/value if needed؛ date/reason/evidence؛ impact؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اصلاح موجودی / Stock adjustment؛ دلیل اصلاح / Adjustment reason؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** preview before-after؛ corrective entry linked original؛ post once.

**9. اعتبارسنجی:** reason required؛ permission؛ value policy؛ no negative impossible qty؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing reference؛ duplicate posted read-only؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** counted quantity، book balance، valuation inputs، document؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** خریدهای فرضی از منابع costing نسازد؛ no erase ledger؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-03 — موجودی افتتاحیه و اصلاح / Stock Adjustment
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ثبت اختلاف با سند
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/inventory/adjustments/new. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: type opening/count discrepancy/damage؛ item/qty/base unit/value if needed؛ date/reason/evidence؛ impact؛ confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: type opening/count discrepancy/damage؛ item/qty/base unit/value if needed؛ date/reason/evidence؛ impact؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اصلاح موجودی / Stock adjustment؛ دلیل اصلاح / Adjustment reason؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: preview before-after؛ corrective entry linked original؛ post once.
اعتبارسنجی: reason required؛ permission؛ value policy؛ no negative impossible qty؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing reference؛ duplicate posted read-only؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: counted quantity، book balance، valuation inputs، document؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: خریدهای فرضی از منابع costing نسازد؛ no erase ledger؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-04"></a>

### OPS-04 — تأمین‌کننده و مانده / Suppliers

**1. نام و شناسه:** OPS-04 — تأمین‌کننده و مانده / Suppliers

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** اطلاعات و ارتباط خرید/بدهی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/suppliers`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list contact/material/service؛ detail info؛ purchases/receipts/payments؛ outstanding balance.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list contact/material/service؛ detail info؛ purchases/receipts/payments؛ outstanding balance. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تأمین‌کنندگان / Suppliers؛ مانده پرداخت‌نشده / Outstanding balance؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** open purchase؛ payment link؛ archive preserving docs.

**9. اعتبارسنجی:** valid contact؛ finance fields permission؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ stale balances؛ supplier archived.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: list/detail tabs؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** supplier records، payable ledger؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** انبار بدون finance permission مانده حساس نبیند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-04 — تأمین‌کننده و مانده / Suppliers
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: اطلاعات و ارتباط خرید/بدهی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/suppliers. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list contact/material/service؛ detail info؛ purchases/receipts/payments؛ outstanding balance.
کامپوننت‌ها و CTA: اجزای اختصاصی: list contact/material/service؛ detail info؛ purchases/receipts/payments؛ outstanding balance. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تأمین‌کنندگان / Suppliers؛ مانده پرداخت‌نشده / Outstanding balance؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: open purchase؛ payment link؛ archive preserving docs.
اعتبارسنجی: valid contact؛ finance fields permission؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ stale balances؛ supplier archived.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: list/detail tabs؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: supplier records، payable ledger؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: انبار بدون finance permission مانده حساس نبیند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-05"></a>

### OPS-05 — فهرست خرید / Purchases

**1. نام و شناسه:** OPS-05 — فهرست خرید / Purchases

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** پیگیری خرید مواد یا کالای نهایی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/purchases`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters supplier/date/receipt/payment؛ amount؛ delivered/pending; create.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters supplier/date/receipt/payment؛ amount؛ delivered/pending; create. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** خریدها / Purchases؛ تحویل و پرداخت / Receipt and payment؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** open document؛ receipt state separate payment؛ return linked.

**9. اعتبارسنجی:** purchase state not one generic paid/delivered؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ partial receipt؛ outstanding.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** purchase summaries، receiving/payable states؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** نسیه بدهی است نه نقد؛ draft stock zero؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-05 — فهرست خرید / Purchases
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: پیگیری خرید مواد یا کالای نهایی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/purchases. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters supplier/date/receipt/payment؛ amount؛ delivered/pending; create.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters supplier/date/receipt/payment؛ amount؛ delivered/pending; create. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: خریدها / Purchases؛ تحویل و پرداخت / Receipt and payment؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: open document؛ receipt state separate payment؛ return linked.
اعتبارسنجی: purchase state not one generic paid/delivered؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: empty؛ partial receipt؛ outstanding.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: purchase summaries، receiving/payable states؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: نسیه بدهی است نه نقد؛ draft stock zero؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-06"></a>

### OPS-06 — سند خرید / Purchase Editor

**1. نام و شناسه:** OPS-06 — سند خرید / Purchase Editor

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ثبت اقلام و هزینه تهیه

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/purchases/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** supplier/date/reference؛ line material/finished SKU/purchase unit/pack count/conversion/price/discount؛ freight direct allocation؛ total؛ credit/payment terms؛ attachments.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: supplier/date/reference؛ line material/finished SKU/purchase unit/pack count/conversion/price/discount؛ freight direct allocation؛ total؛ credit/payment terms؛ attachments. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سند خرید / Purchase document؛ مبلغ خرید / Purchase amount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** draft save؛ approve purchase؛ add receipt separately؛ invoice corrections by reversal.

**9. اعتبارسنجی:** conversion positive؛ totals precise؛ source rates not auto actual; receipt immutable once posted؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: draft؛ missing unit؛ duplicate invoice warn؛ approved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: line editor cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** purchase lines، costs، units، supplier، terms؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-13/14: package purchase value vs consumption؛ actual cost documented؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-06 — سند خرید / Purchase Editor
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ثبت اقلام و هزینه تهیه
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/purchases/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: supplier/date/reference؛ line material/finished SKU/purchase unit/pack count/conversion/price/discount؛ freight direct allocation؛ total؛ credit/payment terms؛ attachments.
کامپوننت‌ها و CTA: اجزای اختصاصی: supplier/date/reference؛ line material/finished SKU/purchase unit/pack count/conversion/price/discount؛ freight direct allocation؛ total؛ credit/payment terms؛ attachments. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سند خرید / Purchase document؛ مبلغ خرید / Purchase amount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: draft save؛ approve purchase؛ add receipt separately؛ invoice corrections by reversal.
اعتبارسنجی: conversion positive؛ totals precise؛ source rates not auto actual; receipt immutable once posted؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: draft؛ missing unit؛ duplicate invoice warn؛ approved.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: line editor cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: purchase lines، costs، units، supplier، terms؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-13/14: package purchase value vs consumption؛ actual cost documented؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-07"></a>

### OPS-07 — تحویل و برگشت خرید / Purchase Receipt

**1. نام و شناسه:** OPS-07 — تحویل و برگشت خرید / Purchase Receipt

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ورود واقعی و کنترل مواد

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/purchases/:id/receipts/new`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** purchase balance؛ received qty/unit؛ batch/location؛ quality accepted/rejected؛ cost impact؛ post؛ return linked.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: purchase balance؛ received qty/unit؛ batch/location؛ quality accepted/rejected؛ cost impact؛ post؛ return linked. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ثبت تحویل / Record receipt؛ میانگین جدید / New weighted average؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** partial receipt؛ return references actual receipt؛ preview weighted average.

**9. اعتبارسنجی:** not exceed unless amended authorized؛ qty positive؛ zero denominator prevented؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: partial؛ failed post؛ posted read-only؛ nothing remaining.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form + totals؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** purchase remainder، accepted quantities، conversion، previous average؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-14: delivered only stock entry؛ payment independently؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-07 — تحویل و برگشت خرید / Purchase Receipt
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ورود واقعی و کنترل مواد
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/purchases/:id/receipts/new. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: purchase balance؛ received qty/unit؛ batch/location؛ quality accepted/rejected؛ cost impact؛ post؛ return linked.
کامپوننت‌ها و CTA: اجزای اختصاصی: purchase balance؛ received qty/unit؛ batch/location؛ quality accepted/rejected؛ cost impact؛ post؛ return linked. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ثبت تحویل / Record receipt؛ میانگین جدید / New weighted average؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: partial receipt؛ return references actual receipt؛ preview weighted average.
اعتبارسنجی: not exceed unless amended authorized؛ qty positive؛ zero denominator prevented؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: partial؛ failed post؛ posted read-only؛ nothing remaining.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form + totals؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: purchase remainder، accepted quantities، conversion، previous average؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-14: delivered only stock entry؛ payment independently؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-08"></a>

### OPS-08 — دستورهای تولید / Production Orders

**1. نام و شناسه:** OPS-08 — دستورهای تولید / Production Orders

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** شارژ انبار آماده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/production`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list SKU/batch/target/started/completed/due； shortage alerts؛ create.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list SKU/batch/target/started/completed/due； shortage alerts؛ create. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تولید برای انبار / Produce for stock؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** new uses BOM version؛ open batch; no storefront order-after-sale.

**9. اعتبارسنجی:** SKU/BOM required؛ capacity informational؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no jobs؛ missing materials؛ delayed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** production batches، BOM readiness، material shortage؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** کالا ناموجود با دستور تولید پیش‌فروش نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-08 — دستورهای تولید / Production Orders
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: شارژ انبار آماده
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/production. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list SKU/batch/target/started/completed/due； shortage alerts؛ create.
کامپوننت‌ها و CTA: اجزای اختصاصی: list SKU/batch/target/started/completed/due； shortage alerts؛ create. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تولید برای انبار / Produce for stock؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: new uses BOM version؛ open batch; no storefront order-after-sale.
اعتبارسنجی: SKU/BOM required؛ capacity informational؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no jobs؛ missing materials؛ delayed.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: production batches، BOM readiness، material shortage؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: کالا ناموجود با دستور تولید پیش‌فروش نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-09"></a>

### OPS-09 — اجرای بچ تولید / Production Batch

**1. نام و شناسه:** OPS-09 — اجرای بچ تولید / Production Batch

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ثبت مصرف و خدمات واقعی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/production/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** SKU/version/target؛ estimated vs actual materials؛ issue qty/cost؛ service receipts/time؛ progress؛ output good/waste؛ final cost preview.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: SKU/version/target؛ estimated vs actual materials؛ issue qty/cost؛ service receipts/time؛ progress؛ output good/waste؛ final cost preview. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مواد مصرف‌شده / Materials consumed؛ تولید ناتمام / Work in progress؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** issue to WIP؛ consume once؛ edit draft rows؛ finalization to QC؛ retain version.

**9. اعتبارسنجی:** target positive؛ actual unit valid؛ no complete before outputs; cost source؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing inputs؛ failed issue؛ WIP no sales؛ ready for QC.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: sections sequential؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** locked BOM، issues، actual services، batch output؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-14: material value→WIP→finished; estimates not replace actual؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-09 — اجرای بچ تولید / Production Batch
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ثبت مصرف و خدمات واقعی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/production/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: SKU/version/target؛ estimated vs actual materials؛ issue qty/cost؛ service receipts/time؛ progress؛ output good/waste؛ final cost preview.
کامپوننت‌ها و CTA: اجزای اختصاصی: SKU/version/target؛ estimated vs actual materials؛ issue qty/cost؛ service receipts/time؛ progress؛ output good/waste؛ final cost preview. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مواد مصرف‌شده / Materials consumed؛ تولید ناتمام / Work in progress؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: issue to WIP؛ consume once؛ edit draft rows؛ finalization to QC؛ retain version.
اعتبارسنجی: target positive؛ actual unit valid؛ no complete before outputs; cost source؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing inputs؛ failed issue؛ WIP no sales؛ ready for QC.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: sections sequential؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: locked BOM، issues، actual services، batch output؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-14: material value→WIP→finished; estimates not replace actual؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-10"></a>

### OPS-10 — کنترل کیفیت و پایان تولید / Production QC

**1. نام و شناسه:** OPS-10 — کنترل کیفیت و پایان تولید / Production QC

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ورود فقط خروجی سالم

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/production/:id/qc`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** good/damaged counts؛ ordinary/abnormal waste reasons؛ checks؛ photos؛ allocation good unit cost؛ confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: good/damaged counts؛ ordinary/abnormal waste reasons؛ checks؛ photos؛ allocation good unit cost؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** خروجی سالم / Accepted output؛ ضایعات غیرعادی / Abnormal waste؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** pass→finished receipt؛ abnormal waste separate؛ rework state.

**9. اعتبارسنجی:** counts reconcile target/actual output؛ healthy>0 for unit cost؛ required actual costs؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: all rejected no divide-by-zero؛ missing costs block final valuation؛ completed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: checklist/cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** inspection، accepted output، cost allocation، warehouse؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** عدم تخصیص double cost؛ final output enters ready stock once؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-10 — کنترل کیفیت و پایان تولید / Production QC
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ورود فقط خروجی سالم
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/production/:id/qc. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: good/damaged counts؛ ordinary/abnormal waste reasons؛ checks؛ photos؛ allocation good unit cost؛ confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: good/damaged counts؛ ordinary/abnormal waste reasons؛ checks؛ photos؛ allocation good unit cost؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: خروجی سالم / Accepted output؛ ضایعات غیرعادی / Abnormal waste؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: pass→finished receipt؛ abnormal waste separate؛ rework state.
اعتبارسنجی: counts reconcile target/actual output؛ healthy>0 for unit cost؛ required actual costs؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: all rejected no divide-by-zero؛ missing costs block final valuation؛ completed.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: checklist/cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: inspection، accepted output، cost allocation، warehouse؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: عدم تخصیص double cost؛ final output enters ready stock once؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="ops-11"></a>

### OPS-11 — ضایعات و خرابی / Waste & Damage

**1. نام و شناسه:** OPS-11 — ضایعات و خرابی / Waste & Damage

**2. نقش و دسترسی:** مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی

**3. هدف:** ردیابی خسارت

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/waste`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters item/batch/reason/date؛ qty/value؛ normal/abnormal؛ attachment؛ disposition.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters item/batch/reason/date؛ qty/value؛ normal/abnormal؛ attachment؛ disposition. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ضایعات و خرابی / Waste and damage؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** link QC/return/adjustment؛ report trends؛ post with reason.

**9. اعتبارسنجی:** unit/value source؛ not deduct same event twice؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no records؛ duplicate source؛ recorded.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** waste docs، sources، costs؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** خرابی مرجوعی مستقیماً available نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: OPS-11 — ضایعات و خرابی / Waste & Damage
نقش و دسترسی: مسئول انبار/تولید یا ادمین با مجوز؛ مبلغ مالی طبق دسترسی
هدف: ردیابی خسارت
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/waste. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters item/batch/reason/date؛ qty/value؛ normal/abnormal؛ attachment؛ disposition.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters item/batch/reason/date؛ qty/value؛ normal/abnormal؛ attachment؛ disposition. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ضایعات و خرابی / Waste and damage؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: link QC/return/adjustment؛ report trends؛ post with reason.
اعتبارسنجی: unit/value source؛ not deduct same event twice؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no records؛ duplicate source؛ recorded.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: waste docs، sources، costs؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: خرابی مرجوعی مستقیماً available نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۲. پنل مالی و گزارش‌ها

<a id="fin-01"></a>

### FIN-01 — داشبورد مالی / Finance Overview

**1. نام و شناسه:** FIN-01 — داشبورد مالی / Finance Overview

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** درک فروش، سود و نقد بدون اختلاط

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** date range؛ sales net/tax؛ gross profit/after direct costs/operating profit؛ cash balances؛ receivables/payables؛ estimate vs realized؛ replacement tab.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: date range؛ sales net/tax؛ gross profit/after direct costs/operating profit؛ cash balances؛ receivables/payables؛ estimate vs realized؛ replacement tab. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** نمای مالی / Financial overview؛ سود تحقق‌یافته / Realized profit؛ سود برآوردی / Estimated profit؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** drilldown سند؛ مبلغ هر شاخص با تعریف؛ no double-count allocated costs.

**9. اعتبارسنجی:** period valid؛ finance permission؛ totals deduplicated؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no data؛ incomplete cost warning؛ stale metrics؛ export ready.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: KPIs دو ستون و جدول خلاصه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** sales، COGS، expenses، cash، receivables، valuation dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-15/18/22: فروش/دریافت/تسویه جدا؛ کالکشن‌های مشترک جمع مضاعف نسازند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-01 — داشبورد مالی / Finance Overview
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: درک فروش، سود و نقد بدون اختلاط
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: date range؛ sales net/tax؛ gross profit/after direct costs/operating profit؛ cash balances؛ receivables/payables؛ estimate vs realized؛ replacement tab.
کامپوننت‌ها و CTA: اجزای اختصاصی: date range؛ sales net/tax؛ gross profit/after direct costs/operating profit؛ cash balances؛ receivables/payables؛ estimate vs realized؛ replacement tab. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: نمای مالی / Financial overview؛ سود تحقق‌یافته / Realized profit؛ سود برآوردی / Estimated profit؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: drilldown سند؛ مبلغ هر شاخص با تعریف؛ no double-count allocated costs.
اعتبارسنجی: period valid؛ finance permission؛ totals deduplicated؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no data؛ incomplete cost warning؛ stale metrics؛ export ready.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: KPIs دو ستون و جدول خلاصه؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: sales، COGS، expenses، cash، receivables، valuation dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-15/18/22: فروش/دریافت/تسویه جدا؛ کالکشن‌های مشترک جمع مضاعف نسازند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-02"></a>

### FIN-02 — دریافت و پرداخت / Cash Movements

**1. نام و شناسه:** FIN-02 — دریافت و پرداخت / Cash Movements

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** ثبت رویداد نقد مستقل از فروش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/movements`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs receipt/payment/transfer؛ filters account/date/party؛ table amount/currency/ref/source؛ new form؛ post confirmation.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs receipt/payment/transfer؛ filters account/date/party؛ table amount/currency/ref/source؛ new form؛ post confirmation. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** دریافت / Receipt؛ پرداخت / Payment؛ انتقال بین حساب‌ها / Account transfer؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** link purchase/refund/settlement؛ transfer two linked sides؛ correction reversal.

**9. اعتبارسنجی:** positive amount؛ account/party required by type؛ transfer different accounts؛ reason؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no movements؛ balance issue؛ duplicate source؛ posted.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards؛ form sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** cash accounts، movement type، source document، actor؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** transfer نه income/expense؛ تسویه دوباره revenue نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-02 — دریافت و پرداخت / Cash Movements
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: ثبت رویداد نقد مستقل از فروش
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/movements. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs receipt/payment/transfer؛ filters account/date/party؛ table amount/currency/ref/source؛ new form؛ post confirmation.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs receipt/payment/transfer؛ filters account/date/party؛ table amount/currency/ref/source؛ new form؛ post confirmation. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: دریافت / Receipt؛ پرداخت / Payment؛ انتقال بین حساب‌ها / Account transfer؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: link purchase/refund/settlement؛ transfer two linked sides؛ correction reversal.
اعتبارسنجی: positive amount؛ account/party required by type؛ transfer different accounts؛ reason؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no movements؛ balance issue؛ duplicate source؛ posted.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards؛ form sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: cash accounts، movement type، source document، actor؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: transfer نه income/expense؛ تسویه دوباره revenue نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-03"></a>

### FIN-03 — بانک و صندوق / Accounts & Balances

**1. نام و شناسه:** FIN-03 — بانک و صندوق / Accounts & Balances

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** مشاهده مانده و ثبت افتتاحیه مستند

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/accounts`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** accounts list؛ balance/date؛ opening doc؛ movements؛ bank reconciliation summary.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: accounts list؛ balance/date؛ opening doc؛ movements؛ bank reconciliation summary. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** حساب‌ها و مانده / Accounts and balances؛ مانده افتتاحیه / Opening balance؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** account detail؛ edit label not historical amount؛ opening adjustment linked.

**9. اعتبارسنجی:** currency explicit؛ opening date/value with evidence؛ no silent balance edit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no accounts setup؛ mismatch؛ reconciled.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards+ledger؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** accounts، opening docs، cash ledger؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** مانده مشتق از اسناد؛ انتقال internal دوبار شمرده نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-03 — بانک و صندوق / Accounts & Balances
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: مشاهده مانده و ثبت افتتاحیه مستند
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/accounts. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: accounts list؛ balance/date؛ opening doc؛ movements؛ bank reconciliation summary.
کامپوننت‌ها و CTA: اجزای اختصاصی: accounts list؛ balance/date؛ opening doc؛ movements؛ bank reconciliation summary. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: حساب‌ها و مانده / Accounts and balances؛ مانده افتتاحیه / Opening balance؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: account detail؛ edit label not historical amount؛ opening adjustment linked.
اعتبارسنجی: currency explicit؛ opening date/value with evidence؛ no silent balance edit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no accounts setup؛ mismatch؛ reconciled.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards+ledger؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: accounts، opening docs، cash ledger؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: مانده مشتق از اسناد؛ انتقال internal دوبار شمرده نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-04"></a>

### FIN-04 — هزینه‌های جاری / Operating Expenses

**1. نام و شناسه:** FIN-04 — هزینه‌های جاری / Operating Expenses

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** ثبت هزینه دوره و پرداخت مستقل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/expenses`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** category/date/payee/amount/document؛ allocated-to-production toggle reference؛ paid/due؛ filters؛ detail.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: category/date/payee/amount/document؛ allocated-to-production toggle reference؛ paid/due؛ filters؛ detail. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** هزینه‌های جاری / Operating expenses؛ هزینه تخصیص‌یافته تولید / Allocated production cost؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** expense create؛ payment link separate؛ exclude duplicate allocated production costs.

**9. اعتبارسنجی:** amount nonnegative؛ category/document refs؛ accrual vs cash visible؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no expense؛ missing evidence flag؛ posted correction only.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form sections/cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** expense docs، allocation refs، payments؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** operating profit همان هزینه BOM را دوباره کم نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-04 — هزینه‌های جاری / Operating Expenses
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: ثبت هزینه دوره و پرداخت مستقل
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/expenses. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: category/date/payee/amount/document؛ allocated-to-production toggle reference؛ paid/due؛ filters؛ detail.
کامپوننت‌ها و CTA: اجزای اختصاصی: category/date/payee/amount/document؛ allocated-to-production toggle reference؛ paid/due؛ filters؛ detail. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: هزینه‌های جاری / Operating expenses؛ هزینه تخصیص‌یافته تولید / Allocated production cost؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: expense create؛ payment link separate؛ exclude duplicate allocated production costs.
اعتبارسنجی: amount nonnegative؛ category/document refs؛ accrual vs cash visible؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no expense؛ missing evidence flag؛ posted correction only.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: form sections/cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: expense docs، allocation refs، payments؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: operating profit همان هزینه BOM را دوباره کم نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-05"></a>

### FIN-05 — بدهی و مطالبات / Payables & Receivables

**1. نام و شناسه:** FIN-05 — بدهی و مطالبات / Payables & Receivables

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** پیگیری مانده اشخاص و درگاه

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/balances`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** tabs suppliers/customers/gateway؛ party table due/paid/remaining/age؛ detail source docs؛ pay/receive.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: tabs suppliers/customers/gateway؛ party table due/paid/remaining/age؛ detail source docs؛ pay/receive. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** بدهی تأمین‌کننده / Supplier payable؛ مطالبات / Receivables؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** partial settlement source allocation؛ party ledger؛ overdue filter.

**9. اعتبارسنجی:** allocation<=unsettled؛ finance permission؛ currencies match؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no balances؛ inconsistent total warning؛ settled.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards ageing badges؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** purchase/sales obligations، allocations، due dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** خرید نسیه cash فوری نیست؛ مانده با سند traceable؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-05 — بدهی و مطالبات / Payables & Receivables
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: پیگیری مانده اشخاص و درگاه
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/balances. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: tabs suppliers/customers/gateway؛ party table due/paid/remaining/age؛ detail source docs؛ pay/receive.
کامپوننت‌ها و CTA: اجزای اختصاصی: tabs suppliers/customers/gateway؛ party table due/paid/remaining/age؛ detail source docs؛ pay/receive. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: بدهی تأمین‌کننده / Supplier payable؛ مطالبات / Receivables؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: partial settlement source allocation؛ party ledger؛ overdue filter.
اعتبارسنجی: allocation<=unsettled؛ finance permission؛ currencies match؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no balances؛ inconsistent total warning؛ settled.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards ageing badges؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: purchase/sales obligations، allocations، due dates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: خرید نسیه cash فوری نیست؛ مانده با سند traceable؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-06"></a>

### FIN-06 — پرداخت‌ها و رسیدها / Transactions

**1. نام و شناسه:** FIN-06 — پرداخت‌ها و رسیدها / Transactions

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** بررسی وضعیت واقعی تراکنش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/payments`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters gateway/status/date/order؛ masked ref/amount؛ detail attempt timeline؛ invoice link؛ verify/reconcile.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters gateway/status/date/order؛ masked ref/amount؛ detail attempt timeline؛ invoice link؛ verify/reconcile. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تراکنش‌ها / Transactions؛ وضعیت نامشخص / Status unknown؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** unknown verify؛ confirmed no repeat capture؛ refund link separate.

**9. اعتبارسنجی:** actions server-defined؛ amount historical؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: pending/failed/cancelled/unknown؛ no results؛ verification completed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards with status action؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** payment attempts، verified state، refs، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-08/09: callback تکرار پول/فروش مضاعف نسازد؛ unknown failed تلقی نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-06 — پرداخت‌ها و رسیدها / Transactions
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: بررسی وضعیت واقعی تراکنش
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/payments. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters gateway/status/date/order؛ masked ref/amount؛ detail attempt timeline؛ invoice link؛ verify/reconcile.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters gateway/status/date/order؛ masked ref/amount؛ detail attempt timeline؛ invoice link؛ verify/reconcile. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تراکنش‌ها / Transactions؛ وضعیت نامشخص / Status unknown؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: unknown verify؛ confirmed no repeat capture؛ refund link separate.
اعتبارسنجی: actions server-defined؛ amount historical؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: pending/failed/cancelled/unknown؛ no results؛ verification completed.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards with status action؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: payment attempts، verified state، refs، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-08/09: callback تکرار پول/فروش مضاعف نسازد؛ unknown failed تلقی نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-07"></a>

### FIN-07 — تسویه درگاه / Gateway Settlement

**1. نام و شناسه:** FIN-07 — تسویه درگاه / Gateway Settlement

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** تطبیق طلب درگاه با واریز بانک

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/settlements`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** batch period/ref؛ confirmed payments؛ gross/fee/net؛ bank receipt؛ matched/unmatched؛ discrepancy panel.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: batch period/ref؛ confirmed payments؛ gross/fee/net؛ bank receipt؛ matched/unmatched؛ discrepancy panel. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تطبیق تسویه / Reconcile settlement؛ مبلغ خالص واریز / Net deposited amount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** import/preview if supported؛ match rows؛ confirm transfer receivable→bank؛ correction.

**9. اعتبارسنجی:** net/gross/fees reconcile؛ no duplicate settlement؛ same currency؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no batches؛ missing payment؛ fee mismatch؛ matched.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: summary + per-row cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** settlement records، payments، bank movements، fees؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-22: درآمد جدید ایجاد نشود؛ matched record immutable؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-07 — تسویه درگاه / Gateway Settlement
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: تطبیق طلب درگاه با واریز بانک
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/settlements. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: batch period/ref؛ confirmed payments؛ gross/fee/net؛ bank receipt؛ matched/unmatched؛ discrepancy panel.
کامپوننت‌ها و CTA: اجزای اختصاصی: batch period/ref؛ confirmed payments؛ gross/fee/net؛ bank receipt؛ matched/unmatched؛ discrepancy panel. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تطبیق تسویه / Reconcile settlement؛ مبلغ خالص واریز / Net deposited amount؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: import/preview if supported؛ match rows؛ confirm transfer receivable→bank؛ correction.
اعتبارسنجی: net/gross/fees reconcile؛ no duplicate settlement؛ same currency؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no batches؛ missing payment؛ fee mismatch؛ matched.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: summary + per-row cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: settlement records، payments، bank movements، fees؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-22: درآمد جدید ایجاد نشود؛ matched record immutable؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-08"></a>

### FIN-08 — بازپرداخت‌ها / Refund Processing

**1. نام و شناسه:** FIN-08 — بازپرداخت‌ها / Refund Processing

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** برگشت مالی مستقل از برگشت کالا

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/refunds`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** list request/order/allocated paid amount/status؛ detail approval/refund destination masked؛ reference؛ confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: list request/order/allocated paid amount/status؛ detail approval/refund destination masked؛ reference؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** بازپرداخت / Refund؛ تأیید بازپرداخت / Approve refund؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** eligible share؛ partial refund؛ permission separate؛ duplicate-safe processing.

**9. اعتبارسنجی:** <=paid less earlier refunds؛ reason؛ exact currency؛ no double refund؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: pending/approved/rejected/failed/unknown؛ processing disabled.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: detail cards+confirmation؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** return/cancel source، allocations، prior refunds، attempts؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-17: price today irrelevant؛ stock restored only QC not refund click؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-08 — بازپرداخت‌ها / Refund Processing
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: برگشت مالی مستقل از برگشت کالا
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/refunds. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: list request/order/allocated paid amount/status؛ detail approval/refund destination masked؛ reference؛ confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: list request/order/allocated paid amount/status؛ detail approval/refund destination masked؛ reference؛ confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: بازپرداخت / Refund؛ تأیید بازپرداخت / Approve refund؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: eligible share؛ partial refund؛ permission separate؛ duplicate-safe processing.
اعتبارسنجی: <=paid less earlier refunds؛ reason؛ exact currency؛ no double refund؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: pending/approved/rejected/failed/unknown؛ processing disabled.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: detail cards+confirmation؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: return/cancel source، allocations، prior refunds، attempts؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-17: price today irrelevant؛ stock restored only QC not refund click؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-09"></a>

### FIN-09 — سود محصول، SKU و پکیج / Profit Report

**1. نام و شناسه:** FIN-09 — سود محصول، SKU و پکیج / Profit Report

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** مقایسه سود واقعی و جایگزینی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/reports/profit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters period/product/SKU/bundle/collection؛ modes historical/replacement؛ revenue/discount/COGS/fees/margin table؛ source drilldown.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters period/product/SKU/bundle/collection؛ modes historical/replacement؛ revenue/discount/COGS/fees/margin table؛ source drilldown. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** سود تاریخی / Historical profit؛ سود با هزینه جایگزینی / Replacement-cost profit؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** expand bundle allocation؛ overlapping collection badge؛ export same filters.

**9. اعتبارسنجی:** complete cost warning؛ denominator zero displayed N/A؛ no historical overwrite؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no data؛ incomplete costing؛ low margin؛ report ready.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: chart text table fallback؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** line snapshots، costs، fee allocations، current estimates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-15/18: جمع کالکشن مشترک dedup؛ profit type label روی همه charts؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-09 — سود محصول، SKU و پکیج / Profit Report
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: مقایسه سود واقعی و جایگزینی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/reports/profit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters period/product/SKU/bundle/collection؛ modes historical/replacement؛ revenue/discount/COGS/fees/margin table؛ source drilldown.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters period/product/SKU/bundle/collection؛ modes historical/replacement؛ revenue/discount/COGS/fees/margin table؛ source drilldown. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: سود تاریخی / Historical profit؛ سود با هزینه جایگزینی / Replacement-cost profit؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: expand bundle allocation؛ overlapping collection badge؛ export same filters.
اعتبارسنجی: complete cost warning؛ denominator zero displayed N/A؛ no historical overwrite؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no data؛ incomplete costing؛ low margin؛ report ready.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: chart text table fallback؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: line snapshots، costs، fee allocations، current estimates؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-15/18: جمع کالکشن مشترک dedup؛ profit type label روی همه charts؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-10"></a>

### FIN-10 — جریان نقدی / Cash Flow

**1. نام و شناسه:** FIN-10 — جریان نقدی / Cash Flow

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** دیدن ورود/خروج پول واقعی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/reports/cashflow`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** period/accounts؛ opening/receipts/payments/closing؛ categories؛ timeline/table؛ compare accrual profit.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: period/accounts؛ opening/receipts/payments/closing؛ categories؛ timeline/table؛ compare accrual profit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** جریان نقدی / Cash flow؛ فروش با دریافت متفاوت است / Sales and receipts differ؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** drilldown source؛ transfers excluded consolidated but visible per account.

**9. اعتبارسنجی:** currency/period consistent؛ no projection as actual؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no flow؛ mismatched balance warning؛ ready export.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: stacked KPI+table؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** cash movements، balances، transfer links؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** خرید مواد cash out اما expense مصرف جدا؛ revenue duplicate ممنوع؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-10 — جریان نقدی / Cash Flow
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: دیدن ورود/خروج پول واقعی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/reports/cashflow. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: period/accounts؛ opening/receipts/payments/closing؛ categories؛ timeline/table؛ compare accrual profit.
کامپوننت‌ها و CTA: اجزای اختصاصی: period/accounts؛ opening/receipts/payments/closing؛ categories؛ timeline/table؛ compare accrual profit. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: جریان نقدی / Cash flow؛ فروش با دریافت متفاوت است / Sales and receipts differ؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: drilldown source؛ transfers excluded consolidated but visible per account.
اعتبارسنجی: currency/period consistent؛ no projection as actual؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no flow؛ mismatched balance warning؛ ready export.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: stacked KPI+table؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: cash movements، balances، transfer links؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: خرید مواد cash out اما expense مصرف جدا؛ revenue duplicate ممنوع؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-11"></a>

### FIN-11 — گزارش موجودی و تولید / Inventory & Production Report

**1. نام و شناسه:** FIN-11 — گزارش موجودی و تولید / Inventory & Production Report

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** ارزش انبار، مصرف و ضایعات

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/reports/inventory`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** material/finished/WIP tabs؛ value/qty/unit؛ batch cost estimate vs actual؛ normal/abnormal waste؛ shortages.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: material/finished/WIP tabs؛ value/qty/unit؛ batch cost estimate vs actual؛ normal/abnormal waste؛ shortages. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** ارزش موجودی / Inventory value؛ هزینه واقعی تولید / Actual production cost؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** trace stock ledger؛ low stock replenishment link؛ export.

**9. اعتبارسنجی:** units not summed incompatible؛ as-of date explicit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no batches؛ unresolved WIP؛ failed valuation.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: chart/table cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** weighted costs، balances، batch costs، waste؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-13/14: remaining materials asset؛ WIP not sellable؛ wastage separated؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-11 — گزارش موجودی و تولید / Inventory & Production Report
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: ارزش انبار، مصرف و ضایعات
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/reports/inventory. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: material/finished/WIP tabs؛ value/qty/unit؛ batch cost estimate vs actual؛ normal/abnormal waste؛ shortages.
کامپوننت‌ها و CTA: اجزای اختصاصی: material/finished/WIP tabs؛ value/qty/unit؛ batch cost estimate vs actual؛ normal/abnormal waste؛ shortages. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: ارزش موجودی / Inventory value؛ هزینه واقعی تولید / Actual production cost؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: trace stock ledger؛ low stock replenishment link؛ export.
اعتبارسنجی: units not summed incompatible؛ as-of date explicit؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no batches؛ unresolved WIP؛ failed valuation.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: chart/table cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: weighted costs، balances، batch costs، waste؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-13/14: remaining materials asset؛ WIP not sellable؛ wastage separated؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fin-12"></a>

### FIN-12 — خروجی حسابدار / Accounting Export

**1. نام و شناسه:** FIN-12 — خروجی حسابدار / Accounting Export

**2. نقش و دسترسی:** مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط

**3. هدف:** تحویل داده قابل ردیابی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/finance/export`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** period/module filters؛ CSV/Excel options؛ preview columns currency/doc ID/date/source/status؛ generate/download history.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: period/module filters؛ CSV/Excel options؛ preview columns currency/doc ID/date/source/status؛ generate/download history. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** خروجی حسابدار / Export for your accountant؛ اسناد اصلاحی / Adjustment documents؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** async job status؛ export only permitted data؛ correction docs included.

**9. اعتبارسنجی:** period/role؛ private download authorized؛ no formal-tax claim؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no records؛ pending generation؛ failed retry؛ link expired.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: controls+preview scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** filtered docs، export job، file permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** خروجی با جمع‌های مالی همان فیلتر منطبق؛ دفتر دوبل فرضی تولید نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FIN-12 — خروجی حسابدار / Accounting Export
نقش و دسترسی: مسئول مالی/ادمین با مجوز گزارش یا اقدام مربوط
هدف: تحویل داده قابل ردیابی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/finance/export. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: period/module filters؛ CSV/Excel options؛ preview columns currency/doc ID/date/source/status؛ generate/download history.
کامپوننت‌ها و CTA: اجزای اختصاصی: period/module filters؛ CSV/Excel options؛ preview columns currency/doc ID/date/source/status؛ generate/download history. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: خروجی حسابدار / Export for your accountant؛ اسناد اصلاحی / Adjustment documents؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: async job status؛ export only permitted data؛ correction docs included.
اعتبارسنجی: period/role؛ private download authorized؛ no formal-tax claim؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no records؛ pending generation؛ failed retry؛ link expired.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: controls+preview scroll؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: filtered docs، export job، file permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: خروجی با جمع‌های مالی همان فیلتر منطبق؛ دفتر دوبل فرضی تولید نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۳. مدیریت سفارش، ارسال و پشتیبانی

<a id="order-01"></a>

### ORDER-01 — فهرست سفارش ادمین / Orders Admin

**1. نام و شناسه:** ORDER-01 — فهرست سفارش ادمین / Orders Admin

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** کنترل فروش و آماده‌سازی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/orders`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters payment/item type/status/date/collection؛ table customer/ref/amount/item count/ready actions؛ bulk only allowed.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters payment/item type/status/date/collection؛ table customer/ref/amount/item count/ready actions؛ bulk only allowed. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** مدیریت سفارش / Order management؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** detail؛ split delivery states؛ no unsafe bulk financial action.

**9. اعتبارسنجی:** permissions by action؛ filter dates valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no results؛ pending payment/review badges؛ retry.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** orders، payment state، fulfillment groups؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** status payment از delivery جدا؛ mixed custom ready states واضح؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-01 — فهرست سفارش ادمین / Orders Admin
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: کنترل فروش و آماده‌سازی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/orders. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters payment/item type/status/date/collection؛ table customer/ref/amount/item count/ready actions؛ bulk only allowed.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters payment/item type/status/date/collection؛ table customer/ref/amount/item count/ready actions؛ bulk only allowed. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: مدیریت سفارش / Order management؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: detail؛ split delivery states؛ no unsafe bulk financial action.
اعتبارسنجی: permissions by action؛ filter dates valid؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no results؛ pending payment/review badges؛ retry.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: table→cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: orders، payment state، fulfillment groups؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: status payment از delivery جدا؛ mixed custom ready states واضح؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="order-02"></a>

### ORDER-02 — جزئیات عملیاتی سفارش / Operations Order

**1. نام و شناسه:** ORDER-02 — جزئیات عملیاتی سفارش / Operations Order

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** هماهنگی اقلام، پرداخت و تحویل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/orders/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** historical items/choices/bundle allocations؛ status timelines؛ reservations؛ address snapshot؛ notes internal/customer؛ payment/invoice؛ allowed actions.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: historical items/choices/bundle allocations؛ status timelines؛ reservations؛ address snapshot؛ notes internal/customer؛ payment/invoice؛ allowed actions. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اقلام و مرسوله‌ها / Items and shipments؛ یادداشت داخلی / Internal note؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** assign artist؛ picking ready stock؛ partial shipment؛ internal notes جدا؛ refund finance link.

**9. اعتبارسنجی:** version state checks؛ cancellation eligibility؛ immutable snapshot؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing reservation؛ late paid no stock؛ partial fulfillment؛ updated.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: sections/tab panels؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** snapshots، allocations، reservations، shipments، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-09/15: late no stock resolution; قیمت قدیم unchanged; storefront costs private؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-02 — جزئیات عملیاتی سفارش / Operations Order
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: هماهنگی اقلام، پرداخت و تحویل
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/orders/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: historical items/choices/bundle allocations؛ status timelines؛ reservations؛ address snapshot؛ notes internal/customer؛ payment/invoice؛ allowed actions.
کامپوننت‌ها و CTA: اجزای اختصاصی: historical items/choices/bundle allocations؛ status timelines؛ reservations؛ address snapshot؛ notes internal/customer؛ payment/invoice؛ allowed actions. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اقلام و مرسوله‌ها / Items and shipments؛ یادداشت داخلی / Internal note؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: assign artist؛ picking ready stock؛ partial shipment؛ internal notes جدا؛ refund finance link.
اعتبارسنجی: version state checks؛ cancellation eligibility؛ immutable snapshot؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: missing reservation؛ late paid no stock؛ partial fulfillment؛ updated.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: sections/tab panels؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: snapshots، allocations، reservations، shipments، allowed actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-09/15: late no stock resolution; قیمت قدیم unchanged; storefront costs private؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="order-03"></a>

### ORDER-03 — آماده‌سازی و ارسال / Fulfillment

**1. نام و شناسه:** ORDER-03 — آماده‌سازی و ارسال / Fulfillment

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** خروج سالم کالا و ثبت حمل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/shipments/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** pick list SKU/bundle quantities؛ QC checklist؛ packaging؛ carrier/weight/cost/label/tracking؛ dispatch confirm.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: pick list SKU/bundle quantities؛ QC checklist؛ packaging؛ carrier/weight/cost/label/tracking؛ dispatch confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** آماده‌سازی ارسال / Prepare shipment؛ ثبت ارسال / Mark as shipped؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** partial qty؛ final dispatch consumes committed stock once؛ custom ready file printing route if ordered.

**9. اعتبارسنجی:** qty<=committed remaining؛ required carrier/tracking config؛ file version for custom print؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: QC failed؛ carrier unavailable؛ duplicate dispatch blocked؛ shipped.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: checklist+big actions؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** shipment lines، picks، packaging، carrier، QC؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** COGS on dispatch؛ پکیج اجزا actual؛ فایل چاپ private؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-03 — آماده‌سازی و ارسال / Fulfillment
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: خروج سالم کالا و ثبت حمل
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/shipments/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: pick list SKU/bundle quantities؛ QC checklist؛ packaging؛ carrier/weight/cost/label/tracking؛ dispatch confirm.
کامپوننت‌ها و CTA: اجزای اختصاصی: pick list SKU/bundle quantities؛ QC checklist؛ packaging؛ carrier/weight/cost/label/tracking؛ dispatch confirm. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: آماده‌سازی ارسال / Prepare shipment؛ ثبت ارسال / Mark as shipped؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: partial qty؛ final dispatch consumes committed stock once؛ custom ready file printing route if ordered.
اعتبارسنجی: qty<=committed remaining؛ required carrier/tracking config؛ file version for custom print؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: QC failed؛ carrier unavailable؛ duplicate dispatch blocked؛ shipped.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: checklist+big actions؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: shipment lines، picks، packaging، carrier، QC؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: COGS on dispatch؛ پکیج اجزا actual؛ فایل چاپ private؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="order-04"></a>

### ORDER-04 — مرجوعی و کنترل کالا / Return Inspection

**1. نام و شناسه:** ORDER-04 — مرجوعی و کنترل کالا / Return Inspection

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** تصمیم موجودی مستقل از وجه

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/returns/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** request/history؛ component qty/paid allocation؛ receipt date؛ QC good/damaged/rejected؛ evidence؛ stock disposition؛ refund link.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: request/history؛ component qty/paid allocation؛ receipt date؛ QC good/damaged/rejected؛ evidence؛ stock disposition؛ refund link. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** کنترل کالای مرجوعی / Inspect returned items؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** restore only accepted good؛ damaged→waste؛ partial quantities; post once.

**9. اعتبارسنجی:** returned qty<=eligible؛ source order costs؛ reason؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not received؛ no eligible quantity؛ inspection conflict؛ posted.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards per component؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** return quantities، inspection، source costs، prior actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** AC-17: refund کلیک stock اضافه نکند؛ repeat restore blocked؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-04 — مرجوعی و کنترل کالا / Return Inspection
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: تصمیم موجودی مستقل از وجه
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/returns/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: request/history؛ component qty/paid allocation؛ receipt date؛ QC good/damaged/rejected؛ evidence؛ stock disposition؛ refund link.
کامپوننت‌ها و CTA: اجزای اختصاصی: request/history؛ component qty/paid allocation؛ receipt date؛ QC good/damaged/rejected؛ evidence؛ stock disposition؛ refund link. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: کنترل کالای مرجوعی / Inspect returned items؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: restore only accepted good؛ damaged→waste؛ partial quantities; post once.
اعتبارسنجی: returned qty<=eligible؛ source order costs؛ reason؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: not received؛ no eligible quantity؛ inspection conflict؛ posted.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: cards per component؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: return quantities، inspection، source costs، prior actions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: AC-17: refund کلیک stock اضافه نکند؛ repeat restore blocked؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="order-05"></a>

### ORDER-05 — صف بررسی سفارش نقاشی / Commission Review Admin

**1. نام و شناسه:** ORDER-05 — صف بررسی سفارش نقاشی / Commission Review Admin

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** تخصیص و نهایی‌کردن quote استثنایی

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/commissions/reviews`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** queue AI confidence/D/reason/due؛ reference preview؛ artist assignment؛ old/new price؛ decision reason؛ customer approval state.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: queue AI confidence/D/reason/due؛ reference preview؛ artist assignment؛ old/new price؛ decision reason؛ customer approval state. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** بررسی سفارش نقاشی / Commission review؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** assign/override authorized؛ notify customer؛ pending not pay.

**9. اعتبارسنجی:** D range؛ reason override؛ quote version fresh؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: AI failed؛ no artist؛ stale quote؛ waiting customer.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: detail stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** AI evidence، assignment، quote versions، decision؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** اثر override به رضایت مشتری؛ نه قیمت SKU آماده؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-05 — صف بررسی سفارش نقاشی / Commission Review Admin
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: تخصیص و نهایی‌کردن quote استثنایی
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/commissions/reviews. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: queue AI confidence/D/reason/due؛ reference preview؛ artist assignment؛ old/new price؛ decision reason؛ customer approval state.
کامپوننت‌ها و CTA: اجزای اختصاصی: queue AI confidence/D/reason/due؛ reference preview؛ artist assignment؛ old/new price؛ decision reason؛ customer approval state. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: بررسی سفارش نقاشی / Commission review؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: assign/override authorized؛ notify customer؛ pending not pay.
اعتبارسنجی: D range؛ reason override؛ quote version fresh؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: AI failed؛ no artist؛ stale quote؛ waiting customer.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: detail stacked؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: AI evidence، assignment، quote versions، decision؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: اثر override به رضایت مشتری؛ نه قیمت SKU آماده؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="order-06"></a>

### ORDER-06 — پشتیبانی ادمین / Support Inbox

**1. نام و شناسه:** ORDER-06 — پشتیبانی ادمین / Support Inbox

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** پاسخ و پیگیری مسائل

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/support`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** queue unread/status/category/order؛ thread؛ private attachments؛ notes internal؛ reply؛ assign/close.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: queue unread/status/category/order؛ thread؛ private attachments؛ notes internal؛ reply؛ assign/close. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** صندوق پشتیبانی / Support inbox؛ پاسخ به مشتری / Reply to customer؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** customer reply vs internal note واضح؛ deep link allowed order.

**9. اعتبارسنجی:** required reply؛ ownership via permission؛ attachment policy؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no tickets؛ send fail preserved؛ closed/reopened.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: queue→thread navigation؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** threads، order refs، assignments، channels؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** note internal هرگز به مشتری ارسال نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-06 — پشتیبانی ادمین / Support Inbox
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: پاسخ و پیگیری مسائل
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/support. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: queue unread/status/category/order؛ thread؛ private attachments؛ notes internal؛ reply؛ assign/close.
کامپوننت‌ها و CTA: اجزای اختصاصی: queue unread/status/category/order؛ thread؛ private attachments؛ notes internal؛ reply؛ assign/close. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: صندوق پشتیبانی / Support inbox؛ پاسخ به مشتری / Reply to customer؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: customer reply vs internal note واضح؛ deep link allowed order.
اعتبارسنجی: required reply؛ ownership via permission؛ attachment policy؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no tickets؛ send fail preserved؛ closed/reopened.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: queue→thread navigation؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: threads، order refs، assignments، channels؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: note internal هرگز به مشتری ارسال نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="order-07"></a>

### ORDER-07 — لاگ و تاریخچه تغییر / Audit Log

**1. نام و شناسه:** ORDER-07 — لاگ و تاریخچه تغییر / Audit Log

**2. نقش و دسترسی:** ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل

**3. هدف:** ردیابی تصمیم‌ها و اصلاحات

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/admin/audit`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** filters actor/action/entity/date؛ immutable rows before/after/reason/source؛ detail.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: filters actor/action/entity/date؛ immutable rows before/after/reason/source؛ detail. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تاریخچه فعالیت / Activity log؛ مقدار قبلی و جدید / Before and after؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** pricing/material/stock/refund changes deep links؛ export permitted.

**9. اعتبارسنجی:** audit permission؛ secrets masked؛ no edit/delete؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no events؛ missing referenced archived record؛ loaded.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: timeline cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.

**14. داده مورد نیاز:** audit events، actor، diffs، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** اسناد قطعی حذف بی‌ردپا نشوند؛ رمز/OTP log نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: ORDER-07 — لاگ و تاریخچه تغییر / Audit Log
نقش و دسترسی: ادمین/اپراتور مجاز؛ بازپرداخت فقط مجوز مالی مستقل
هدف: ردیابی تصمیم‌ها و اصلاحات
مسیر و ورود/خروج: مسیر پیشنهادی: /admin/audit. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: filters actor/action/entity/date؛ immutable rows before/after/reason/source؛ detail.
کامپوننت‌ها و CTA: اجزای اختصاصی: filters actor/action/entity/date؛ immutable rows before/after/reason/source؛ detail. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تاریخچه فعالیت / Activity log؛ مقدار قبلی و جدید / Before and after؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: pricing/material/stock/refund changes deep links؛ export permitted.
اعتبارسنجی: audit permission؛ secrets masked؛ no edit/delete؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no events؛ missing referenced archived record؛ loaded.
دسکتاپ و موبایل: دسکتاپ: پوسته ادمین با sidebar ۲۴۸px، breadcrumb، جست‌وجو و header نقش؛ actionهای غیرمجاز نمایش/اجرا نشوند. موبایل: timeline cards؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. جدول caption/header دارد؛ در موبایل label ستون کنار مقدار باقی بماند.
داده مورد نیاز: audit events، actor، diffs، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: اسناد قطعی حذف بی‌ردپا نشوند؛ رمز/OTP log نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۴. صفحات و حالت‌های سیستمی

<a id="sys-01"></a>

### SYS-01 — خطای ۴۰۴ / Not Found

**1. نام و شناسه:** SYS-01 — خطای ۴۰۴ / Not Found

**2. نقش و دسترسی:** نقش مربوط به عملیات جاری

**3. هدف:** بازگشت به مسیر معتبر

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/404`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** icon هنری کوچک؛ عنوان؛ توضیح؛ home/shop/search actions.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: icon هنری کوچک؛ عنوان؛ توضیح؛ home/shop/search actions. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** صفحه پیدا نشد / Page not found؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** preserve search term if safe؛ no dead ends.

**9. اعتبارسنجی:** no private record existence leak؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: loading next route؛ empty unavailable resource؛ retry network؛ recovery success home.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: centered panel؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** requested route class، safe alternatives؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** URL خصوصی ناموجود با owner info افشا نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: SYS-01 — خطای ۴۰۴ / Not Found
نقش و دسترسی: نقش مربوط به عملیات جاری
هدف: بازگشت به مسیر معتبر
مسیر و ورود/خروج: مسیر پیشنهادی: /404. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: icon هنری کوچک؛ عنوان؛ توضیح؛ home/shop/search actions.
کامپوننت‌ها و CTA: اجزای اختصاصی: icon هنری کوچک؛ عنوان؛ توضیح؛ home/shop/search actions. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: صفحه پیدا نشد / Page not found؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: preserve search term if safe؛ no dead ends.
اعتبارسنجی: no private record existence leak؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: loading next route؛ empty unavailable resource؛ retry network؛ recovery success home.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: centered panel؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: requested route class، safe alternatives؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: URL خصوصی ناموجود با owner info افشا نشود؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="sys-02"></a>

### SYS-02 — عدم دسترسی / Access Denied

**1. نام و شناسه:** SYS-02 — عدم دسترسی / Access Denied

**2. نقش و دسترسی:** نقش مربوط به عملیات جاری

**3. هدف:** توضیح محدودیت نقش

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/403`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** icon؛ message؛ account context؛ back؛ switch role if legitimate؛ support.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: icon؛ message؛ account context؛ back؛ switch role if legitimate؛ support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** به این بخش دسترسی ندارید / You don't have access to this section؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** login if session missing؛ no inaccessible nav.

**9. اعتبارسنجی:** permission from server؛ no elevation self-service؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: unknown permission retry؛ access restored navigation.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: full-width message؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** permission state، permitted destinations؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** داده مالی پشت error نباید قابل مشاهده بماند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: SYS-02 — عدم دسترسی / Access Denied
نقش و دسترسی: نقش مربوط به عملیات جاری
هدف: توضیح محدودیت نقش
مسیر و ورود/خروج: مسیر پیشنهادی: /403. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: icon؛ message؛ account context؛ back؛ switch role if legitimate؛ support.
کامپوننت‌ها و CTA: اجزای اختصاصی: icon؛ message؛ account context؛ back؛ switch role if legitimate؛ support. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: به این بخش دسترسی ندارید / You don't have access to this section؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: login if session missing؛ no inaccessible nav.
اعتبارسنجی: permission from server؛ no elevation self-service؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: unknown permission retry؛ access restored navigation.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: full-width message؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: permission state، permitted destinations؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: داده مالی پشت error نباید قابل مشاهده بماند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="sys-03"></a>

### SYS-03 — قطع اتصال و اختلال / Offline & Service Error

**1. نام و شناسه:** SYS-03 — قطع اتصال و اختلال / Offline & Service Error

**2. نقش و دسترسی:** نقش مربوط به عملیات جاری

**3. هدف:** بازیابی امن بدون از دست رفتن فرم

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/error`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** status banner؛ saved/unsaved indicator؛ retry؛ request reference؛ last known timestamp.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: status banner؛ saved/unsaved indicator؛ retry؛ request reference؛ last known timestamp. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** اتصال برقرار نیست / You're offline؛ اطلاعات قبلی / Last available data؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** don't repeat mutation automatically؛ reload read data; retain safe draft؛ payment unknown verifying.

**9. اعتبارسنجی:** sensitive fields not persist insecurely؛ stale price prevents pay؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: offline؛ server unavailable؛ retrying؛ restored.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: banner avoids overlay blocking form؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.

**14. داده مورد نیاز:** network status، safe draft، operation state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** قیمت stale/stock stale با pay فعال نباشد؛ duplicate financial writes نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: SYS-03 — قطع اتصال و اختلال / Offline & Service Error
نقش و دسترسی: نقش مربوط به عملیات جاری
هدف: بازیابی امن بدون از دست رفتن فرم
مسیر و ورود/خروج: مسیر پیشنهادی: /error. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: status banner؛ saved/unsaved indicator؛ retry؛ request reference؛ last known timestamp.
کامپوننت‌ها و CTA: اجزای اختصاصی: status banner؛ saved/unsaved indicator؛ retry؛ request reference؛ last known timestamp. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: اتصال برقرار نیست / You're offline؛ اطلاعات قبلی / Last available data؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: don't repeat mutation automatically؛ reload read data; retain safe draft؛ payment unknown verifying.
اعتبارسنجی: sensitive fields not persist insecurely؛ stale price prevents pay؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: offline؛ server unavailable؛ retrying؛ restored.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: banner avoids overlay blocking form؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px.
داده مورد نیاز: network status، safe draft، operation state؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: قیمت stale/stock stale با pay فعال نباشد؛ duplicate financial writes نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="sys-04"></a>

### SYS-04 — تأیید و تغییر ذخیره‌نشده / Confirmation & Unsaved Changes

**1. نام و شناسه:** SYS-04 — تأیید و تغییر ذخیره‌نشده / Confirmation & Unsaved Changes

**2. نقش و دسترسی:** نقش مربوط به عملیات جاری

**3. هدف:** تصمیم واضح پیش از عمل حساس

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `modal / bottom sheet`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** entity name؛ action effect/amount/count؛ primary/secondary؛ reason if required؛ progress.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: entity name؛ action effect/amount/count؛ primary/secondary؛ reason if required؛ progress. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** تغییر ذخیره‌نشده / Unsaved changes؛ تأیید عملیات / Confirm action؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** cancel restore focus؛ save draft vs discard; destructive confirm؛ action once.

**9. اعتبارسنجی:** reason required where business rule؛ exact scope before bulk؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no selection؛ in flight؛ conflict؛ completed.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: desktop modal؛ mobile bottom sheet safe-area؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** action descriptor، selected rows، dirty state، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** publish قیمت، refund، QC stock حتماً scope دقیق؛ هیچ خودکار پس login؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: SYS-04 — تأیید و تغییر ذخیره‌نشده / Confirmation & Unsaved Changes
نقش و دسترسی: نقش مربوط به عملیات جاری
هدف: تصمیم واضح پیش از عمل حساس
مسیر و ورود/خروج: مسیر پیشنهادی: modal / bottom sheet. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: entity name؛ action effect/amount/count؛ primary/secondary؛ reason if required؛ progress.
کامپوننت‌ها و CTA: اجزای اختصاصی: entity name؛ action effect/amount/count؛ primary/secondary؛ reason if required؛ progress. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: تغییر ذخیره‌نشده / Unsaved changes؛ تأیید عملیات / Confirm action؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: cancel restore focus؛ save draft vs discard; destructive confirm؛ action once.
اعتبارسنجی: reason required where business rule؛ exact scope before bulk؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: no selection؛ in flight؛ conflict؛ completed.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: desktop modal؛ mobile bottom sheet safe-area؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: action descriptor، selected rows، dirty state، permissions؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: publish قیمت، refund، QC stock حتماً scope دقیق؛ هیچ خودکار پس login؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۵. صفحات آینده؛ اختیاری و خارج از عرضه اولیه

<a id="fut-01"></a>

### FUT-01 — خبرم‌کن و هدیه / Restock & Gift Options

**1. نام و شناسه:** FUT-01 — خبرم‌کن و هدیه / Restock & Gift Options

**2. نقش و دسترسی:** کاربر مجاز فقط پس از فعال‌سازی قابلیت

**3. هدف:** طراحی اختیاری امکانات مرحله بعد

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/future/restock و /future/gift`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** restock consent/phone summary؛ gift packaging/message preview/cost؛ separate components.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: restock consent/phone summary؛ gift packaging/message preview/cost؛ separate components. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** خبرم کن / Notify me؛ پیام هدیه / Gift message؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** only enable feature flag؛ notify exact SKU؛ gift charge separate.

**9. اعتبارسنجی:** channel consent؛ message length from config؛ no pre-sale؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: already subscribed؛ delivery unavailable؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: modal desktop/sheet mobile؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** feature flags، SKU، preferences، gift options؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** غیرفعال در عرضه اولیه؛ ثبت درخواست موجودی فروش نباشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FUT-01 — خبرم‌کن و هدیه / Restock & Gift Options
نقش و دسترسی: کاربر مجاز فقط پس از فعال‌سازی قابلیت
هدف: طراحی اختیاری امکانات مرحله بعد
مسیر و ورود/خروج: مسیر پیشنهادی: /future/restock و /future/gift. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: restock consent/phone summary؛ gift packaging/message preview/cost؛ separate components.
کامپوننت‌ها و CTA: اجزای اختصاصی: restock consent/phone summary؛ gift packaging/message preview/cost؛ separate components. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: خبرم کن / Notify me؛ پیام هدیه / Gift message؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: only enable feature flag؛ notify exact SKU؛ gift charge separate.
اعتبارسنجی: channel consent؛ message length from config؛ no pre-sale؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: فرم اولیه با فیلدهای خالی و راهنما، بدون نمایش خطای required پیش از تعامل؛ در نبود گزینه لازم، اقدام ایجاد/بازگشت مجاز ارائه شود. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: already subscribed؛ delivery unavailable؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: modal desktop/sheet mobile؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: feature flags، SKU، preferences، gift options؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: غیرفعال در عرضه اولیه؛ ثبت درخواست موجودی فروش نباشد؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fut-02"></a>

### FUT-02 — موکاپ زنده / Live Mockup

**1. نام و شناسه:** FUT-02 — موکاپ زنده / Live Mockup

**2. نقش و دسترسی:** کاربر مجاز فقط پس از فعال‌سازی قابلیت

**3. هدف:** پیش‌نمایش آینده بدون دورزدن فروش آماده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/future/mockup/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** large canvas؛ product/variant؛ safe print area؛ layer؛ position/scale/rotation؛ undo/reset؛ preview save.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: large canvas؛ product/variant؛ safe print area؛ layer؛ position/scale/rotation؛ undo/reset؛ preview save. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پیش‌نمایش طرح / Preview artwork؛ محدوده امن چاپ / Safe print area؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** drag/pinch plus numeric keyboard؛ explicit آینده؛ saved preview not purchase unless model authorized.

**9. اعتبارسنجی:** safe area/resolution؛ allowed transforms؛ هیچ SKU ناموجود خرید نشود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: render failed fallback 2D؛ unsupported product؛ out of bounds؛ saved.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: bottom toolbar + numeric sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند. focus trap، Escape و بازگردانی focus به trigger لازم است.

**14. داده مورد نیاز:** future capabilities، mockup asset، transform، print constraints؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** ویرایش طرح به معنی تولید پس خرید در مدل جاری نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FUT-02 — موکاپ زنده / Live Mockup
نقش و دسترسی: کاربر مجاز فقط پس از فعال‌سازی قابلیت
هدف: پیش‌نمایش آینده بدون دورزدن فروش آماده
مسیر و ورود/خروج: مسیر پیشنهادی: /future/mockup/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: large canvas؛ product/variant؛ safe print area؛ layer؛ position/scale/rotation؛ undo/reset؛ preview save.
کامپوننت‌ها و CTA: اجزای اختصاصی: large canvas؛ product/variant؛ safe print area؛ layer؛ position/scale/rotation؛ undo/reset؛ preview save. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پیش‌نمایش طرح / Preview artwork؛ محدوده امن چاپ / Safe print area؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: drag/pinch plus numeric keyboard؛ explicit آینده؛ saved preview not purchase unless model authorized.
اعتبارسنجی: safe area/resolution؛ allowed transforms؛ هیچ SKU ناموجود خرید نشود؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: render failed fallback 2D؛ unsupported product؛ out of bounds؛ saved.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: bottom toolbar + numeric sheet؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند. focus trap، Escape و بازگردانی focus به trigger لازم است.
داده مورد نیاز: future capabilities، mockup asset، transform، print constraints؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: ویرایش طرح به معنی تولید پس خرید در مدل جاری نیست؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

<a id="fut-03"></a>

### FUT-03 — AR و پیش‌نمایش سبک / AR & Style Preview

**1. نام و شناسه:** FUT-03 — AR و پیش‌نمایش سبک / AR & Style Preview

**2. نقش و دسترسی:** کاربر مجاز فقط پس از فعال‌سازی قابلیت

**3. هدف:** طرح قابلیت بصری آینده

**4. مسیر و ورود/خروج:** مسیر پیشنهادی: `/future/preview/:id`. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.

**5. چیدمان از بالا به پایین:** preview disclaimer؛ sample generated image؛ camera consent for AR؛ static fallback؛ no exact-color claim.

**6. کامپوننت‌ها و CTA:** اجزای اختصاصی: preview disclaimer؛ sample generated image؛ camera consent for AR؛ static fallback؛ no exact-color claim. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.

**7. متن فارسی و انگلیسی:** پیش‌نمایش تقریبی / Approximate preview؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.

**8. تعاملات:** explicit user gesture camera؛ cancel؛ comparison original/preview.

**9. اعتبارسنجی:** capability/permission؛ generated preview ≠ final artwork؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.

**10. حالت‌ها:** Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: permission denied؛ device unsupported؛ processing failure؛ preview ready.

**11. دسکتاپ و موبایل:** دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: full preview with exit؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.

**12. RTL/LTR:** fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.

**13. دسترس‌پذیری:** label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.

**14. داده مورد نیاز:** capabilities، preview generation state، consent؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.

**15. معیار پذیرش:** اختیاری و مانع checkout اصلی نباشد؛ preview قیمتی را قطعی نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

**۱۶. پرامپت مستقل AI — تمام متن داخل کادر را کپی کنید:**

```text
نیل‌آرت فروشگاه کالکشن‌محور محصولات آماده و سفارش نقاشی است. فارسی RTL و انگلیسی LTR، دسکتاپ 1440 و موبایل 390 با آزمون 320/768px. زمینه #F8F5EF، سطح #FFFFFF، متن #211E1A، ثانویه #706B63، حاشیه #E5DED3، تأکید #A44A32، موفقیت #28745B، خطا #B33B35؛ فونت Vazirmatn/Inter؛ body 16px، عنوان 32px/24px؛ spacing 4/8/12/16/24/32/48/64، radius 8/14/24، هدف لمس 44px، contrast 4.5:1. داده‌های نمونه نمایشی‌اند. قیمت فروش و هزینه داخلی جدا؛ فقط موجودی آماده قابل فروش، نقاشی سفارشی استثنا. قالب گرم گالری، بدون تزئین شلوغ.

این صفحه را به‌صورت طراحی قابل تحویل به توسعه بساز. هیچ بخش مالی، نقش، مسیر یا feature خارج از این مشخصات اضافه نکن. متن فارسی و انگلیسی واقعی بده. فریم‌های desktop/mobile و RTL/LTR، component states و annotation رفتار را ارائه کن.

نام و شناسه: FUT-03 — AR و پیش‌نمایش سبک / AR & Style Preview
نقش و دسترسی: کاربر مجاز فقط پس از فعال‌سازی قابلیت
هدف: طرح قابلیت بصری آینده
مسیر و ورود/خروج: مسیر پیشنهادی: /future/preview/:id. ورودی از فهرست، ناوبری یا CTA مرتبط؛ خروج با CTAهای همین صفحه و breadcrumb. مقصد/فیلتر/پیش‌نویس در بازگشت حفظ شود؛ انتقال حساس خودکار تکرار نشود.
چیدمان از بالا به پایین: preview disclaimer؛ sample generated image؛ camera consent for AR؛ static fallback؛ no exact-color claim.
کامپوننت‌ها و CTA: اجزای اختصاصی: preview disclaimer؛ sample generated image؛ camera consent for AR؛ static fallback؛ no exact-color claim. CTA اصلی مطابق هدف و تعامل این صفحه؛ primary فقط برای اقدام بعدی، secondary برای بازگشت/لغو؛ اقدام مالی/انتشار با شرح اثر و تأیید صریح.
متن فارسی و انگلیسی: پیش‌نمایش تقریبی / Approximate preview؛ loading: در حال بارگذاری… / Loading…؛ empty: اطلاعاتی برای نمایش نیست / No data to display؛ error: دوباره تلاش کنید / Try again؛ success: عملیات انجام شد / Completed successfully.
تعاملات: explicit user gesture camera؛ cancel؛ comparison original/preview.
اعتبارسنجی: capability/permission؛ generated preview ≠ final artwork؛ اعتبارسنجی سمت سرور مرجع نهایی، خطا کنار فیلد و بدون پاک‌کردن ورودی.
حالت‌ها: Loading: skeleton هم‌شکل ناحیه داده؛ submit در حال اجرا loading و غیرقابل تکرار. Empty: بدون رکورد/نتیجه، پیام و اقدام مجاز مانند حذف فیلتر، ایجاد اولین رکورد یا بازگشت؛ بدون داده ساختگی. Error: پیام علت قابل فهم، retry مجاز و حفظ ورودی/فیلتر. Success: نتیجه روشن و گام بعدی متناسب با هدف؛ بدون ادعای پرداخت/انتشار/تحویل قبل تأیید سرویس. حالت‌های اختصاصی: permission denied؛ device unsupported؛ processing failure؛ preview ready.
دسکتاپ و موبایل: دسکتاپ: پوسته عمومی با header کالکشن/فروشگاه/نقاشی/جست‌وجو/زبان/حساب/سبد و footer؛ محتوای ۱۲۸۰px. موبایل: full preview with exit؛ منوی پنل drawer و فیلترها bottom sheet؛ CTA چسبان جلوی content و keyboard را نگیرد.
RTL/LTR: fa راست‌به‌چپ و en چپ‌به‌راست؛ sidebar/breadcrumb/فلش آینه شوند. تصویر و icon معنایی ثابت؛ تلفن، OTP، SKU، رهگیری و فرمول در محدوده LTR. عدد/تاریخ locale-aware و واحد پول صریح؛ زبان ارز را تغییر ندهد.
دسترس‌پذیری: label دائمی، focus واضح، ترتیب tab معنایی، خطا مرتبط با input، icon+text برای وضعیت، اعلام نتیجه با live region، target لمس ۴۴px. تصاویر alt معنادار و zoom قابل بستن با keyboard دارند.
داده مورد نیاز: capabilities، preview generation state، consent؛ شکل API تعیین نشده؛ loading/error/permissions و freshness جزئی از داده UI‌اند.
معیار پذیرش: اختیاری و مانع checkout اصلی نباشد؛ preview قیمتی را قطعی نکند؛ چهار فریم fa/en در دسکتاپ/موبایل، default/loading/empty/error/success و keyboard flow تحویل شوند.

برای متن‌های ثانویه از معادل‌های فارسی/انگلیسی روشن استفاده کن. ورود داده اولیه را از no-results و خطای سرویس جدا کن. عملیات حساس یک‌بار اجرا شود. فایل چاپ و هزینه داخلی به مهمان/مشتری نشان داده نشوند. معیار پذیرش را در طراحی و prototype نشان بده.
```

## ۱۶. جریان‌های قابل prototype

### FLOW-01 — خرید دفتر از کالکشن

PUB-01 → PUB-02 → PUB-03 گربه → فیلتر دفتر طراحی → PUB-06 → انتخاب A5، تعداد برگ و جلد → تعداد دفتر → PUB-09 → AUTH-01 تا AUTH-06 در صورت نیاز → PUB-10 تا PUB-13 → PUB-14 → PUB-15 → USER-03.

در نمونه، سایز A4/A5/A6 و تعداد برگ انتخاب SKU را عوض کنند؛ تغییر تعداد دفتر فقط مبلغ و تقاضای موجودی را تغییر دهد. ترکیب ناموجود و ناسازگار جدا طراحی شوند. خرید از دسته PUB-04 و جست‌وجو PUB-05 به همان detail و همان موجودی برسد.

### FLOW-02 — پکیج و کد در سبد مختلط

PUB-07 → PUB-08 → انتخاب گزینه دفتر از دامنه مجاز → PUB-09 با یک محصول مستقل → واردکردن کد → نمایش تخفیف محصول مستقل و مستثناشدن پکیج → PUB-13 رزرو اجزا → پرداخت.

پکیج یک ردیف مشتری با اجزای قابل مشاهده است؛ انبار اجزای واقعی را رزرو می‌کند. برای تست، SKU تکراری در اجزای پکیج بسازید و ظرفیت را از تعداد تجمیعی محاسبه کنید. فعال‌کردن stacking توسط ادمین در ADM-10 باید سناریوی مجزا داشته باشد.

### FLOW-03 — نرخ جدید تا قیمت منتشرشده

COST-02 تغییر نرخ کاغذ → COST-07 محاسبه وابسته‌ها → COST-09 صف → COST-08 بررسی margin → COST-10 مقایسه و اثر پکیج → تأیید دستی → تاریخچه.

شاخه‌ها: نرخ نامشخص → محاسبه ناقص و بدون انتشار؛ پیشنهاد قدیمی پس از تغییر دوم → محاسبه مجدد؛ رد با دلیل → رفع هشدار تا تغییر بعدی. هیچ نرخ ورودی به‌تنهایی قیمت مشتری را عوض نکند. تخمین جدید، متوسط واقعی انبار و سفارش تاریخی را بازنویسی نکند.

### FLOW-04 — خرید مواد تا موجودی آماده

OPS-05 → OPS-06 خرید نسیه → OPS-07 تحویل جزئی → افزایش انبار و میانگین موزون → OPS-08/09 شروع بچ با نسخه BOM → مصرف مواد و خدمات واقعی → OPS-10 خروجی سالم/خراب → OPS-01 موجودی نهایی → PUB-06 قابل خرید.

خرید بسته کامل، مقدار مصرف و وجه پرداختی جدا طراحی شوند. تولید ناتمام قابل فروش نیست. خروجی صفر سالم، تقسیم هزینه بر صفر ندارد. کمبود مواد به هشدار می‌رود و پیش‌فروش مشتری ایجاد نمی‌کند.

### FLOW-05 — فروش تا تسویه و سود

PUB-15 پرداخت تأییدشده → ORDER-02 تعهد موجودی → ORDER-03 خروج/ارسال → انتقال هزینه به COGS → FIN-09 سود تحقق‌یافته → FIN-07 تسویه درگاه → FIN-03 مانده بانک.

پرداخت، فروش، خروج انبار و تسویه هرکدام مرجع/زمان جدا داشته باشند. تسویه درآمد دوم نیست. سود قبل خروج برآوردی و بعد خروج طبق هزینه واقعی تاریخی باشد.

### FLOW-06 — مرجوعی جزئی پکیج

USER-03 → USER-06 انتخاب جزء و تعداد → USER-07 درخواست ثبت‌شده → ORDER-04 دریافت/QC → سالم به انبار یا خراب به OPS-11 → FIN-08 بازپرداخت سهم پرداختی → USER-07 نتیجه.

برگشت فیزیکی و مالی دو timeline مستقل‌اند؛ بازپرداخت به‌تنهایی موجودی را زیاد نکند. مبلغ بازگشت از snapshot پرداخت و تخفیف تخصیص‌یافته باشد.

### FLOW-07 — سفارش نقاشی و تأیید طرح

PAINT-03 → PAINT-04 → PAINT-05 → PAINT-06 → PAINT-07 → در صورت لزوم ORDER-05/ART-04 → تأیید قیمت مشتری → سبد و پرداخت → ART-05 نسخه اولیه → USER-09 تأیید/اصلاح → نسخه نهایی → USER-08 یا ORDER-03 ارسال.

قلم pending review از پرداخت جدا بماند؛ خرید کالاهای آماده در سبد ممکن باشد. درصد افزایش قیمت فقط از محاسبه واقعی و شرایط اصلاحات از توافق واقعی باشند.

### FLOW-08 — پرداخت نامشخص و دیرهنگام

PUB-13 → PUB-14 unknown → بررسی وضعیت → موفق/ناموفق قطعی. تا روشن شدن، پرداخت دوباره پیشنهاد نشود. موفقیت پس از انقضای رزرو با موجودی کافی به تخصیص دوباره و با کمبود به ORDER-02 رسیدگی مالی/FIN-08 برود؛ مشتری پیام رسیدگی ببیند، نه وعده ارسال.

### FLOW-09 — بازیابی auth و فرم

AUTH-02 ورود رمز یا AUTH-03/05 ورود OTP؛ ثبت‌نام AUTH-04/05/06؛ فراموشی AUTH-07/05/08. نشست منقضی در فرم مالی به AUTH-09 می‌رود؛ پس از ورود، draft مجاز بازگردد و اقدام انتشار/پرداخت/تولید خودکار تکرار نشود.

## ۱۷. قرارداد وضعیت و خطا

### ۱۷.۱ ماتریس عملیات

| عملیات | وضعیت‌های لازم | مسیر بازیابی |
|---|---|---|
| SKU | انتخاب‌نشده، معتبر، ناسازگار، ناموجود، قیمت/موجودی تغییرکرده | انتخاب مجدد/تأیید تغییر؛ بدون پیش‌فروش |
| پکیج | ترکیب معتبر، جزء ناموجود، ظرفیت کم، تخفیف نامعتبر | تغییر فقط گزینه مجاز؛ اجزا اجباری |
| Upload | آماده، درحال ارسال، موفق، بخشی ناموفق، نامعتبر | retry همان فایل؛ حفظ موفق‌ها |
| OTP | ارسال، countdown، اشتباه، منقضی، محدودیت تلاش، تأیید | resend طبق زمان سرویس/تغییر شماره |
| AI | queued، processing، slow، complete، failed، review لازم | retry یا بررسی انسانی |
| Payment | ایجاد، redirect، verifying، موفق، شکست، لغو، unknown، late paid | بررسی unknown؛ retry فقط امن؛ رسیدگی کمبود |
| Quote | draft، pending artist، نهایی، تغییرکرده، منقضی | بررسی و تأیید قیمت مشتری |
| Cost | complete، missing rate/unit/BOM، stale | اصلاح منبع و محاسبه مجدد |
| Price review | نیازمند بررسی، ناقص، آماده تأیید، رد، تأیید، superseded | تصمیم دستی، محاسبه مجدد stale |
| Purchase | پیش‌نویس/قطعی؛ تحویل صفر/جزئی/کامل؛ پرداخت صفر/جزئی/کامل | سه محور جدا؛ سند اصلاح مرتبط |
| Production | برنامه، مصرف، WIP، QC، تکمیل، دوباره‌کاری، ضایعات | فقط خروجی سالم وارد آماده |
| Return | درخواست، بررسی، دریافت، QC، رد/قبول جزئی | بدون فرض بازپرداخت انجام‌شده |
| Refund | درخواست، مجاز، processing، موفق، شکست، unknown | تکرار امن طبق وضعیت تأییدشده |

### ۱۷.۲ متن تخصصی دو‌زبانه

| موقعیت | فارسی | English |
|---|---|---|
| گزینه ناسازگار | این ترکیب ارائه نمی‌شود؛ گزینه دیگری انتخاب کنید | This combination isn't offered; choose another option |
| ناموجود | این گزینه فعلاً موجود نیست | This option is currently out of stock |
| جزء پکیج | یکی از اجزای انتخاب‌شده موجود نیست | One selected component is out of stock |
| کد و پکیج | این کد روی پکیج اعمال نمی‌شود؛ سایر اقلام مجاز تخفیف دارند | This code doesn't apply to the bundle; other eligible items are discounted |
| هزینه ناقص | نرخ چاپ داخل مشخص نیست؛ قیمت پیشنهادی قابل تأیید نیست | Interior printing cost is unknown; the suggested price can't be approved |
| نرخ جدید | هزینه تغییر کرده است؛ قیمت عمومی هنوز ثابت است | Costs have changed; public prices haven't changed yet |
| پیشنهاد قدیمی | ورودی محاسبه تغییر کرده؛ دوباره محاسبه کنید | Calculation inputs changed; recalculate before publishing |
| بررسی پرداخت | وضعیت پرداخت هنوز مشخص نیست؛ دوباره پرداخت نکنید | Payment status is still being checked; do not pay again yet |
| پرداخت دیرهنگام | پرداخت تأیید شد؛ موجودی سفارش در حال بررسی است | Payment was confirmed; we're checking stock for your order |
| مرجوعی | کالا باید پیش از بازگشت به انبار بررسی شود | Items must be inspected before being returned to sellable stock |
| بدون خروجی سالم | خروجی سالمی ثبت نشده؛ بهای واحد قابل محاسبه نیست | No accepted output is recorded; unit cost can't be calculated |
| نبود مجوز | مجوز این عملیات را ندارید | You don't have permission for this action |

پیام سرور و اصطلاحاتی مانند webhook، mutex یا SQL به مشتری نشان داده نشوند. پنل عملیاتی مرجع خطا قابل کپی دارد. خطا نباید موفقیت یا شکست مالی را بدون تأیید قطعی اعلام کند.

## ۱۸. نگاشت پذیرش PRD به صفحات

| معیار PRD | صفحات اصلی | فریم/سناریوی لازم |
|---|---|---|
| AC-01 | PUB-03، PUB-04 | کالکشن گربه با فیلتر دفتر |
| AC-02 | ADM-02، PUB-03، OPS-01 | عضویت مشترک، یک موجودی |
| AC-03 | PUB-06، ADM-06 | تغییر سایز/برگ، حالت ناسازگار |
| AC-04 | PUB-06، PUB-09 | تعداد دفتر مستقل از برگ |
| AC-05 | PUB-13، OPS-01/02 | آخرین موجودی و خطای رزرو |
| AC-06 | PUB-08، ADM-08، OPS-02 | SKU تکراری در پکیج |
| AC-07 | PUB-09، ADM-10 | سبد مختلط، stacking روشن/خاموش |
| AC-08 | PUB-14/16، FIN-06، OPS-02 | شکست و callback تکراری |
| AC-09 | PUB-14، ORDER-02 | late paid با کمبود |
| AC-10 | COST-02/09/10 | فقط وابسته‌ها، عدم انتشار خودکار |
| AC-11 | COST-05/07/08 | هزینه خالی، واحد مبهم |
| AC-12 | PUB-06، COST-03/05/07 | ۵۰ برگ و نرخ دورو |
| AC-13 | OPS-06، COST-07، FIN-11 | خرید بسته در برابر مصرف |
| AC-14 | OPS-07/09/10، FIN-11 | میانگین موزون و خروجی سالم |
| AC-15 | USER-04، COST-10، FIN-09 | نرخ جدید و snapshot تاریخی |
| AC-16 | COST-08 | margin، fee، گردکردن |
| AC-17 | USER-06/07، ORDER-04، FIN-08 | مرجوعی جزئی پکیج |
| AC-18 | FIN-01/09 | هم‌پوشانی کالکشن و جمع یکتا |
| AC-19 | PAINT-07، PUB-09، ART-04 | نقاشی pending کنار کالای آماده |
| AC-20 | ADM-11، SYS-02 | فایل خصوصی/مالی در نقش مشتری |
| AC-21 | PUB-11/12، USER-03 | digital-only و mixed |
| AC-22 | FIN-07 | تسویه مستقل از درآمد |

## ۱۹. استاندارد تحویل و داده نمونه

### ۱۹.۱ خروجی هر صفحه

- صفحه با ID و route همین سند نام‌گذاری شود.
- چهار فریم فارسی/انگلیسی و desktop/mobile؛ تبلت و عرض ۳۲۰px در QA بررسی شوند.
- default، hover، focus، disabled، loading، empty، error و success برای componentهای مرتبط؛ حالت نامرتبط با توضیح «کاربرد ندارد» علامت بخورد.
- prototype ورودی و خروجی، بازگشت، حفظ پیش‌نویس و validation.
- annotation منبع داده، مجوز و شرط نمایش CTA؛ نام API یا schema فرضی ساخته نشود.
- نمونه متن دو‌زبانه، layout بدون clipping، مبلغ با currency و عدد هم‌تراز.
- keyboard path و modal focus؛ تصاویر alt و نمودار جدول متنی.
- استفاده از همان توکن‌ها و کامپوننت‌های Design System در همه صفحات.

### ۱۹.۲ داده نمونه مشترک پیشنهادی

کالکشن گربه/روح/گاو/qolche/Love؛ محصول دفتر طراحی ۱۲۷ گرم با A4/A5/A6 و دو مقدار تعداد برگ نمایشی مجاز؛ یک SKU موجود، یکی ناموجود و یک ترکیب غیرقابل ارائه. پکیج گربه با دفتر و استیکر و نشانک، و یک محصول مستقل در سبد برای آزمایش کد تخفیف.

در پنل هزینه، یک نرخ خالی، یک صفر آگاهانه، تغییر نرخ کاغذ و وابستگی پکیج نمونه بسازید. مقدار هزینه ۱۰۰٬۰۰۰ و هدف سود ۲۵٪ فقط مثال آموزشی است، نه پیش‌فرض واقعی. حاشیه سود هدف در فرم واقعی خالی بماند تا مالک تعیین کند.

در مالی، یک خرید نسیه، تحویل جزئی، پرداخت جزئی، بچ با خروجی سالم/خراب، سفارش ارسال‌شده و تسویه درگاه بسازید. شناسه‌های نمونه مثل NA-DEMO-001 و برچسب «داده نمایشی / Demo data» از داده واقعی متمایز باشند.

### ۱۹.۳ مرزهای طراحی

موکاپ، AR، خبرم‌کن و هدیه در FUT مستقل و آینده‌اند. حسابداری رسمی دوبل، اظهارنامه، وفاداری امتیازی، marketplace چندفروشنده و فروش کالای آماده بدون موجودی در دامنه جاری نیستند. فرم حسابداری عملیاتی با این امکانات گسترش نیابد.

قبول نهایی طراحی زمانی است که FLOW-01 تا FLOW-09 و AC-01 تا AC-22 با صفحات مشخص قابل نمایش باشند؛ قواعد مالی، موجودی و نقش‌ها حتی در طراحی نمایشی نقض نشوند.

