export const versiculos = [
  { versiculo: "Os planos bem elaborados levam à fartura, mas o apressado sempre acaba na miséria.", referencia: "Provérbios 21:5" },
  { versiculo: "Honra ao Senhor com os teus bens e com as primícias de toda a tua renda.", referencia: "Provérbios 3:9" },
  { versiculo: "Procurai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", referencia: "Mateus 6:33" },
  { versiculo: "Dai, e ser-vos-á dado; boa medida, recalcada, sacudida e transbordando.", referencia: "Lucas 6:38" },
  { versiculo: "Riquezas de vaidade diminuirão, mas quem ajunta com trabalho terá aumento.", referencia: "Provérbios 13:11" },
  { versiculo: "O rico domina os pobres, e o que toma emprestado é servo do que empresta.", referencia: "Provérbios 22:7" },
  { versiculo: "O amor ao dinheiro é raiz de todos os males.", referencia: "1 Timóteo 6:10" },
  { versiculo: "O que confia nas suas riquezas cairá, mas os justos reverdecerão.", referencia: "Provérbios 11:28" },
  { versiculo: "Quem ama o dinheiro jamais se fartará de dinheiro.", referencia: "Eclesiastes 5:10" },
  { versiculo: "O meu Deus suprirá todas as vossas necessidades.", referencia: "Filipenses 4:19" },
  { versiculo: "O homem fiel terá muitas bênçãos.", referencia: "Provérbios 28:20" },
  { versiculo: "Lembra-te do Senhor teu Deus, porque é ele quem te dá poder para adquirir riqueza.", referencia: "Deuteronômio 8:18" },
  { versiculo: "A mão negligente empobrece, mas a mão dos diligentes enriquece.", referencia: "Provérbios 10:4" },
  { versiculo: "Trazei todos os dízimos à casa do tesouro.", referencia: "Malaquias 3:10" },
  { versiculo: "Vai ter com a formiga, ó preguiçoso; considera os seus caminhos e sê sábio.", referencia: "Provérbios 6:6" },
  { versiculo: "Cada um dê conforme propôs no seu coração, não com tristeza ou por necessidade.", referencia: "2 Coríntios 9:7" },
  { versiculo: "Há tesouro precioso na casa do sábio.", referencia: "Provérbios 21:20" },
  { versiculo: "Não se aparte da tua boca o livro da lei; medita nele de dia e de noite.", referencia: "Josué 1:8" },
  { versiculo: "Em todo o trabalho há proveito, mas o falar muito leva à penúria.", referencia: "Provérbios 14:23" },
  { versiculo: "A ninguém deveis coisa alguma, senão o amor mútuo.", referencia: "Romanos 13:8" },
];

export function getVersiculoAleatorio() {
  return versiculos[Math.floor(Math.random() * versiculos.length)];
}
