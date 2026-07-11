# Facebook Monitor Bot

Monitor pentru pagini Facebook care trimite alerte in Telegram cand detecteaza o postare noua.

## Fisiere importante

- `monitor.py` - monitorul principal
- `pages.txt` - paginile Facebook urmarite
- `.env.example` - model de configurare, fara token
- `docker-compose.yml` - pornire permanenta cu Docker

Nu pune tokenul Telegram in GitHub. Tokenul se pune doar pe server in fisierul `.env`.
