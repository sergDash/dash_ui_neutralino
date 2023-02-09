= Установка =

Все файлы закинуть в папку ui в dashcore-1.18.1/bin/

= Пул-реквесты =

Поскольку код работает со средствами пользователя, то подключение всяких фреймворков, сложных и тянущих код со сторонних источников будет отвергаться. В данном проекте используется подход минимализма, чтобы код можно было оценить и понять как он работает, и чтобы на это не понадобилось несколько челокеко-лет.

= Можно запускать и кошелек dash-qt =

но в файле

C:\Users\user\AppData\Roaming\DashCore\dash.conf

добавить строчку

server=1

чтобы веб-интерфейс получил доступ к ноде.

= Известные проблемы =

Neutralinojs умеет запускать приложение в "window" режиме,
подхватывает браузер по умолчанию и умеет отображать значок в трее (windows).
Но браузер шлет CORS preflight запросы, а dashd не умеет на них отвечать.
Поэтому приходится пока запускать в режиме "chrome" с параметром --disable-web-security.
В Neutralinojs обещают допилить модуль net, с помощью которого можно будет
слать rpc запросы без танцев с бубном https://github.com/neutralinojs/roadmap

= TODO =

Пользователя нужно избавить от прописывания rpcuser и rpcpassword в dash.conf
Делать это автоматически если их нет.

Остановку кошелька тоже отслеживать и отображать желтый кружок.
