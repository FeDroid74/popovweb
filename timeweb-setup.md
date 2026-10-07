# Публикация PopovWeb на Timeweb

Workflow `.github/workflows/timeweb.yml` собирает и проверяет сайт при push в `main`.
Автопубликация подключена 7 октября 2026: отдельный SSH-ключ добавлен на Timeweb,
отпечаток сервера проверен через консоль хостинга, секреты сохранены в GitHub Actions.
Первая публикация: https://github.com/FeDroid74/popovweb/actions/runs/37618911392

Из других веток этот workflow сайт не публикует. GitHub Pages остаётся отдельным
workflow. Шаги ниже нужны для повторной настройки или замены ключа.

## 1. Доступ на Timeweb

На дашборде Timeweb включите SSH в блоке «Статус сервисов». Адрес сервера указан
в блоке «Доступ по FTP». Для SSH используется основной пользователь аккаунта,
в нашем случае `cz013423`, обычно порт 22. Пароль нужен только для первого входа.

Создайте отдельную пару Ed25519-ключей для GitHub Actions. Публичную часть `.pub`
добавьте в `~/.ssh/authorized_keys` на Timeweb, сохранив существующие ключи.
Права: `~/.ssh` — 700, `authorized_keys` — 600. Приватный ключ храните локально
в игнорируемой папке `.deploy/` и в GitHub Actions Secret, не в Git и не в переписке.
Рекомендуемый префикс строки в authorized_keys:
`no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-pty`.

В SSH-консоли проверьте `pwd`, `command -v rsync`, наличие `~/public_html/index.html`
и `~/public_html/.htaccess`. Workflow намеренно работает только с уже существующим
`public_html` под домашней папкой пользователя и проверяет наличие PopovWeb.

В отдельном проверенном сеансе получите отпечаток ключа сервера (либо уточните его
у Timeweb). Сопоставьте его с `ssh-keyscan`; сохраните соответствующую строку
known_hosts. Workflow не принимает неизвестный ключ сервера автоматически.

## 2. Настройки GitHub

Репозиторий: https://github.com/FeDroid74/popovweb

Settings → Secrets and variables → Actions → Variables:

| Name | Значение |
| --- | --- |
| `TIMEWEB_SSH_HOST` | Проверенный адрес сервера Timeweb |
| `TIMEWEB_SSH_PORT` | `22`, если панель не указывает другое |
| `TIMEWEB_SSH_USER` | `cz013423` |
| `TIMEWEB_DEPLOY_ENABLED` | Сначала `false`, после настройки доступа — `true` |

В той же странице, вкладка Secrets:

| Name | Значение |
| --- | --- |
| `TIMEWEB_SSH_KEY` | Полный приватный ключ, включая BEGIN/END |
| `TIMEWEB_KNOWN_HOSTS` | Проверенная строка ключа SSH-сервера для используемого хоста/порта |

После настройки: Actions → Publish PopovWeb to Timeweb → Run workflow → main.
Успех подтверждает не только копирование, но и загрузка главной, `/en/`, политики
и `deployment.json` с совпадением опубликованного commit SHA.

## 3. Повседневная работа

Редактируйте исходники, например `pages/home.html`, а не сгенерированную главную.
После push/merge в `main` workflow проверит код, соберёт `dist` и опубликует сайт.
Сбой проверки останавливает публикацию. Результат виден во вкладке Actions.

На сервер передаются только файлы из `dist`. Сначала ресурсы, затем HTML.
`.htaccess`, `.well-known`, `cgi-bin`, посторонние файлы в `api` и `.env*` защищены от перезаписи.
Собственный обработчик `api/contact.php` обновляется отдельно перед ресурсами и HTML.
Настройки HTTPS сохраняются. Удаление произвольных серверных файлов отключено;
при удалении страницы из проекта её старую копию на сервере нужно убрать отдельно.

Заменяемые файлы сохраняются вне сайта в
`~/.popovweb-deploy-backups/<run>-<attempt>-<commit>/`. Это копии изменённых файлов,
а не полный снимок сайта; старые резервные копии нужно периодически очищать.
При ошибке передачи часть файлов могла обновиться: исправьте причину и повторите
workflow либо верните предыдущий коммит в `main` и опубликуйте его заново.

## Telegram и форма

Обработчик `server/contact.php` попадает в сборку Timeweb как `/api/contact.php`.
Нужны PHP 8.2+, cURL и mbstring. В браузере остаётся прежняя форма с проверкой
полей и согласия; ответ об успехе выдаётся только после подтверждения Telegram.
Сервер принимает JSON, проверяет длину и формат полей и допускает пять попыток
от одного IP за десять минут. Файл ограничения хранит хеши IP, без текста заявок.

Настройки бота: `~/.config/popovweb/telegram.json` (папка 700, файл 600).
Этот каталог находится вне `public_html`. Токен не нужен в GitHub Actions,
HTML, JavaScript или `dist`. Числовой chat ID принадлежит получателю, который
сначала запустил бота. Имя пользователя Telegram не заменяет ID личного чата.

Для первичной установки или замены настроек заполните локальный игнорируемый
`.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) и выполните
`node scripts/setup-timeweb-contact.mjs`. Скрипт использует проверенный SSH-ключ
из `.deploy`, проверяет бота и чат через Telegram, затем устанавливает закрытую
конфигурацию и обработчик. Секреты передаются через SSH stdin и не печатаются.
Повторный запуск сохраняет предыдущий обработчик в серверную резервную копию.

GitHub Pages остаётся статическим сайтом: repository variable `CONTACT_ENDPOINT`
нужно установить в `https://popovweb.com/api/contact.php`. Сервер разрешает CORS
только для `https://popovweb.com` и `https://fedroid74.github.io`; заявки из Pages
помечаются `[TEST · GitHub Pages]`. В production форма использует `/api/contact.php`.

Проверки перед публикацией: `php -l server/contact.php`,
`php qa/contact-php.test.php`, `npm test`, `node qa/timeweb.test.mjs`.
Тест PHP работает с фиктивными данными и не отправляет сообщения в Telegram.
Один реальный тест отправляется отдельно после установки через форму сайта.

## Индексация

Сборка использует домен `https://popovweb.com/`, корень `/`, закрытую индексацию
и PHP-форму. На сервере также остаётся временный `X-Robots-Tag` в `.htaccess`.
Для открытия индексации нужно отдельно обновить настройки сборки,
проверку `scripts/check-timeweb.mjs` и убрать этот заголовок.
Токен Telegram никогда не должен попадать в браузерную сборку или GitHub-репозиторий.

Документация: [Timeweb SSH/SFTP](https://timeweb.com/ru/docs/virtualnyj-hosting/podklyuchenie-k-serveru-hostinga/podklyuchenie-po-sftp/).
API отправки: [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage).
