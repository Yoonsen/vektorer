# Vektorer - Applikasjonsarkitektur & Manifest

Dette dokumentet beskriver konseptet, arkitekturen og matematikken bak "Vektorer" – et pedagogisk verktøy utviklet for å undervise i lineær algebra, data science, og statistikk ved hjelp av levende data fra Nasjonalbiblioteket.

## 1. Konsept og Pedagogisk Mål
Applikasjonen fungerer som "to apper i én":
1. **Lineær Algebra & Maskinlæring**: Introduserer vektorer (dokumenter som punkter i et rom), dimensjonsreduksjon (PCA), ortogonale projeksjoner, og konseptet "Informasjonstap" (Loss) når 2D-data klemmes ned til 1D.
2. **Statistikk & The Law of Large Numbers**: Viser hvordan varians, korrelasjon (Pearson's $r$) og statistisk signifikans avhenger av utvalgsstørrelse (Sample Size) ved å la brukerne bygge korpus av ulik størrelse (f.eks 50 vs 2000 bøker) og resample dem.

## 2. Arkitektur
Prosjektet er bygget med **React (Vite)** og bruker **Framer Motion** for fjærbaserte mikroanimasjoner som gir en organisk "feel" når data komprimeres.

### Kjernekomponenter
- **`LlmGeneratedComponent.tsx`**: Hovedmotoren. Håndterer global state (X/Y-akse ord) og en liste med `CorpusLayer`-objekter. Den tegner også selve SVG-grafen dynamisk.
- **`nbApi.ts`**: Tjenestelaget som kommuniserer med DH-lab (api.nb.no).

## 3. Dataflyt og API-strategi
For å unngå å overbelaste backend (spesielt FTS5-søkemotoren) med tunge tekstsøk under korpusbyggingen, er API-kallene delt i to sekvensielle steg per korpus-lag:

1. **Korpusbygging (`POST /build_corpus`)**:
   - Tar inn utelukkende metadata (årstall, forfatter, DDK, Emne) og en `limit` (utvalgsstørrelse).
   - Returnerer en liste med URN-er (unike bok-IDer).
2. **Frekvenstelling (`POST /frequencies`)**:
   - Tar hele listen med URN-er fra forrige steg, sammen med de to globale ordene.
   - Returnerer absolutte frekvenser og totalt antall ord per bok. Klienten regner deretter om til **Relativ Frekvens** (forekomster per 100 000 ord).

## 4. Matematikk og Skalering
Siden ulike korpus og sjangre har massivt ulik ordbruk, gjøres det flere matematiske beregninger på klientsiden for å gjøre dataene sammenlignbare:

### Global Skalering
For at punkter fra et korpus med lav frekvens (f.eks Filosofi) skal kunne plottes i samme koordinatsystem som et korpus med skyhøy frekvens (f.eks Barnebøker), beregner komponenten et **Globalt Maksimum** for X og Y på tvers av *alle aktive lag*. Dataene mappes deretter lineært inn i SVG-rommet `[10, 90]`.

### PCA og Projeksjon
For hvert lag beregnes den Første Prinsipalkomponenten (PCA) i SVG-rommet:
1. Gjennomsnittet (Senteret) for X og Y finnes.
2. Varians og Kovarians ($sXX, sYY, sXY$) beregnes for å bygge kovariansmatrisen.
3. Den største egenverdien ($\lambda_1$) og tilhørende egenvektor kalkuleres. Denne egenvektoren utgjør den stiplede "Target"-linjen i UI-et.
4. Punktene projiseres ortogonalt ned på denne linjen ved hjelp av prikkprodukt. Animasjonen (Slideren) interpolerer (Lerp) punktene fra original posisjon til prosjektert posisjon.

### Loss (Informasjonstap) og Korrelasjon ($r$)
- **Pearsons Korrelasjonskoeffisient ($r$)**: Beregnes på de **rå, opprinnelige relative frekvensene** for å sikre at statistikken forblir matematisk ren og upåvirket av SVG-skaleringen.
- **Loss (Kvadratfeil)**: Beregnes basert på den euklidske avstanden punktene må "reise" fra sin 2D-posisjon ned til den 1D-projiserte linjen i SVG-rommet. *(Pedagogisk poeng: Høy frekvens og stor spredning = massivt loss).*

## 5. UI-Struktur (Layers)
- **Globalt Panel**: Setter ord (X/Y) for hele appen. Utløser oppdatering for alle lag.
- **Layer Panel**: Et kort-basert (collapsible) grensesnitt hvor brukeren bygger uavhengige datasett med ulik farge. Har verktøy for å "Resample" (trekke nye bøker for å teste varians) og skjule/vise lag.
- **Graf & Slider**: Visuell fremstilling av vektorene og en kompresjons-slider for å fysisk aktivere dimensjonsreduksjonen.
