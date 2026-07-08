# Vektorer App - Veikart og Pedagogisk Fokus

Denne filen fungerer som retningslinjer og en huskeliste for fremtidige iterasjoner av "Vektorer"-applikasjonen.

## Overordnet Mål
Applikasjonen skal fungere som en **pedagogisk introduksjon** til grunnleggende konsepter innen lineær algebra, data science og maskinlæring, med spesiell vekt på språkmodeller og tekstanalyse. 

Hovedkonseptene som skal læres bort er:
1. **Vektorer**: Hvordan dokumenter/ord kan representeres som punkter i et rom (vektorer av frekvenser).
2. **Dimensjonsreduksjon og Kompresjon**: Hvordan vi kan klemme 2D-data (eller n-D data) ned til 1D (eller færre dimensjoner) ved hjelp av teknikker som PCA (Principal Component Analysis).
3. **Projeksjoner**: Hvordan datapunkt visuelt og matematisk faller vinkelrett ned på hovedkomponenten (den ortogonale projeksjonen).
4. **Distansemål og Tap (Loss)**: Hvor mye informasjon som går tapt når avstander mellom punkter endres eller forsvinner på grunn av kompresjon.

## Nåværende Status
- Vi bruker ekte språkdata hentet live fra **Nasjonalbiblioteket (dhlab API)**.
- Vi bruker **relativ frekvens** for å unngå at dokumentlengde forstyrrer vektorene.
- Grunnleggende 2D -> 1D projeksjon fungerer, med dynamisk beregning av informasjonstap (loss).

## Planer for Neste Iterasjoner (Drodling)
- **Synliggjøring av distansemål**: Vise den faktiske avstanden (f.eks. Euclidean distance eller Cosine Similarity) mellom to bestemte bøker før og etter kompresjon for å konkretisere konseptet "Informasjonstap".
- **Interaktiv utforsking**: La brukeren skrive inn sine *egne* ordpar i stedet for kun å bruke en forhåndsdefinert nedtrekksmeny.
- **Tydeligere pedagogisk UI**: 
  - Kanskje tegne selve "vektorpilene" fra origo til et par utvalgte bøker for å virkelig poengtere at "dette er en vektor".
  - Vise projeksjonslinjene (den stiplede linjen fra punktet og ned til hovedkomponenten) tydeligere underveis i animasjonen.
- **Trinnvis opplæring (Onboarding)**: Dele opp opplevelsen slik at brukeren først lærer om hva X- og Y-aksen betyr (vektorer), deretter hva linjen betyr (PCA/optimal kompresjon), og til slutt hva projeksjonen innebærer (Loss).
- **Overlapping av Flere Korpus (Lag/Layers)**: Siden datapunktmengden er relativt liten per spørring, kan vi lagre hvert genererte korpus (inkludert metadata som tid/emne) i en lokal liste/state.
  - Slik kan studentene bygge flere korpus på rad (f.eks "Barnebøker" vs "Filosofi", eller "1950-tallet" vs "2020-tallet") og plotte dem over hverandre med forskjellige farger.
  - Vi kan ha et lite panel med sjekkbokser der man kan skru av/på de ulike lagene for å sammenligne korrelasjon, tap (loss) og mønstre på tvers av sjanger eller tid!
  - **Grensesnitt:** Ordvalget (X- og Y-akse) holdes globalt og helt adskilt fra selve "korpus-byggeren", slik at man bytter ord for *alle* aktive korpus samtidig.
  - **Resampling:** Hvert lag/korpus får en "Resample"-knapp for å trekke ut et nytt, tilfeldig utvalg på 100 bøker fra Nasjonalbiblioteket for den gitte kategorien, for å vise at trenden er konsistent (eller ikke!).

## Kommunikasjonsform (Agent Rules)
- Når du snakker med meg (brukeren), skal du alltid bruke uformelle pronomen som "du", "din", og "ditt" på norsk (aldri "De" eller "Deres"). Hold tonen vennlig, engasjert og samarbeidsvillig!
