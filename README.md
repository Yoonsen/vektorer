# Vektorer - Pedagogisk Introduksjon til Dimensjonsreduksjon og Statistikk

Dette er en React/Vite-applikasjon designet for å lære bort grunnleggende konsepter i lineær algebra (vektorer, PCA, projeksjoner, loss) og statistikk (varians, korrelasjon, the Law of Large Numbers) ved hjelp av ekte data fra Nasjonalbiblioteket (DH-lab).

## 🤖 AI Co-development & Architecture
Dette prosjektet er utviklet gjennom "Pair Programming" mellom en menneskelig humanist/forsker og en AI-agent (**Google Antigravity**). 

For fremtidige AI-agenter som skal klone, lese eller bygge videre på denne applikasjonen, vennligst les [architecture.md](./architecture.md) som ligger i roten av repositoriet. Dette dokumentet inneholder all nødvendig informasjon for å forstå konseptet, dataflyten og de matematiske beregningene som gjøres på klientsiden.

## Kom i gang (Kjøring lokalt)

For å kjøre appen lokalt trenger du Node.js.

1. Installer avhengigheter:
```bash
npm install
```

2. Start dev-serveren:
```bash
npm run dev
```

Applikasjonen gjør live API-kall mot Nasjonalbibliotekets DH-lab (api.nb.no) og bygger opp korpus interaktivt.

## Kreditter / Collaborators
- **Lars G. Johnsen** (Ide, konsept, faglig og teoretisk fundament)
- **Google Antigravity** (AI Agent / Utvikler: kode-implementasjon, SVG-matematikk og UI-design)
