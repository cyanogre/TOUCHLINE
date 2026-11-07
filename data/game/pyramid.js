/* TOUCHLINE — divisiones inferiores (la pirámide para subir desde abajo).
   Los clubes son reales; sus plantillas se generan siempre igual (semilla fija) a partir de esta lista.
   ¡Ojo! Las partidas guardadas con la versión 1 dependen de que esta lista no cambie:
   para añadir o cambiar ligas, crea una versión nueva (TL_PYRAMID_V) y conserva la anterior.

   Cada liga: { name, country, flag, under (liga de la que es inferior), k (suben y bajan),
                wealth (riqueza), rep (nivel medio de sus plantillas), clubs: [[nombre, color1, color2], …] }
   Los clubes van más o menos de más fuertes a menos. */
window.TL_PYRAMID_V = 1;
window.TL_PYRAMID = {
  1: {
    M: [
      { name: 'Primera Federación', country: 'España', flag: 'es', under: 'LALIGA HYPERMOTION', k: 4, wealth: 0.32, rep: 64.5, clubs: [
        ['Real Zaragoza', '#ffffff', '#1d4fa0'], ['Hércules CF', '#1d4fa0', '#ffffff'], ['Real Murcia', '#c8102e', '#ffffff'], ['FC Cartagena', '#111111', '#ffffff'],
        ['Racing Club Ferrol', '#0b7a3b', '#ffffff'], ['CD Lugo', '#c8102e', '#ffffff'], ['SD Ponferradina', '#1d4fa0', '#ffffff'], ['Cultural Leonesa', '#ffffff', '#1a1a1a'],
        ['Gimnàstic de Tarragona', '#d0102b', '#111111'], ['UD Ibiza', '#5aa9e6', '#ffffff'], ['AD Alcorcón', '#f4d40b', '#1d4fa0'], ['Algeciras CF', '#c8102e', '#ffffff'],
        ['Mérida AD', '#ffffff', '#2f2f2f'], ['Antequera CF', '#1a3f8f', '#ffffff'], ['Real Unión', '#ffffff', '#1a1a1a'], ['Barakaldo CF', '#ffd400', '#111111'],
        ['CD Teruel', '#c8102e', '#ffffff'], ['Zamora CF', '#c8102e', '#ffffff'], ['CD Alcoyano', '#ffffff', '#1d4fa0'], ['SD Amorebieta', '#1d4fa0', '#ffffff'],
      ] },
      { name: 'Segunda Federación', country: 'España', flag: 'es', under: 'Primera Federación', k: 4, wealth: 0.2, rep: 60, clubs: [
        ['Recreativo de Huelva', '#1d4fa0', '#ffffff'], ['Real Jaén', '#ffffff', '#5b2a86'], ['Xerez CD', '#1d4fa0', '#ffffff'], ['Linares Deportivo', '#1f5fbf', '#ffffff'],
        ['Pontevedra CF', '#b11b4a', '#ffffff'], ['Ourense CF', '#1d4fa0', '#ffffff'], ['Unionistas de Salamanca', '#ffffff', '#111111'], ['CD Guadalajara', '#ffffff', '#5b2a86'],
        ['Real Avilés', '#ffffff', '#1d4fa0'], ['UD Logroñés', '#ffffff', '#c8102e'], ['Talavera CF', '#ffffff', '#1d4fa0'], ['CD San Fernando', '#1d4fa0', '#ffffff'],
        ['UD Melilla', '#1d4fa0', '#ffffff'], ['CD Arenteiro', '#ffffff', '#1d4fa0'], ['Gimnástica Segoviana', '#c8102e', '#ffffff'], ['SD Tarazona', '#c8102e', '#ffffff'],
        ['UP Langreo', '#1d4fa0', '#ffffff'], ['Marino de Luanco', '#4a7fd1', '#ffffff'], ['UE Cornellà', '#1d4fa0', '#ffffff'], ['CE Europa', '#ffffff', '#1d4fa0'],
      ] },
      { name: 'National League', country: 'Inglaterra', flag: 'gb-eng', under: 'EFL League Two', k: 2, wealth: 0.24, rep: 58.5, clubs: [
        ['Carlisle United', '#1d4fa0', '#ffffff'], ['Morecambe', '#c8102e', '#ffffff'], ['Hartlepool United', '#1d4fa0', '#ffffff'], ['Southend United', '#1d4fa0', '#ffffff'],
        ['Forest Green Rovers', '#7cc243', '#111111'], ['Scunthorpe United', '#7a1f3d', '#7fb2e5'], ['Chester FC', '#1d4fa0', '#ffffff'], ['Yeovil Town', '#2f7a3a', '#ffffff'],
        ['Woking', '#c8102e', '#ffffff'], ['Altrincham', '#c8102e', '#ffffff'], ['Aldershot Town', '#c8102e', '#1d4fa0'], ['Boston United', '#f4b400', '#111111'],
        ['Braintree Town', '#f37021', '#1d4fa0'], ['Brackley Town', '#c8102e', '#ffffff'], ['Eastleigh', '#1d4fa0', '#ffffff'], ['FC Halifax Town', '#1d4fa0', '#ffffff'],
        ['Gateshead', '#ffffff', '#111111'], ['Solihull Moors', '#f4d40b', '#1d4fa0'], ['Sutton United', '#f4d40b', '#2f7a3a'], ['Tamworth', '#c8102e', '#ffffff'],
        ['Truro City', '#ffffff', '#111111'], ['Wealdstone', '#1d4fa0', '#ffffff'], ['Dagenham & Redbridge', '#c8102e', '#1d4fa0'], ['Ebbsfleet United', '#c8102e', '#ffffff'],
      ] },
      { name: 'Serie C', country: 'Italia', flag: 'it', under: 'Serie BKT', k: 4, wealth: 0.32, rep: 64, clubs: [
        ['Bari', '#c8102e', '#ffffff'], ['Spezia', '#ffffff', '#111111'], ['Salernitana', '#7a1f3d', '#ffffff'], ['Brescia', '#1d4fa0', '#ffffff'],
        ['Reggiana', '#7a1f3d', '#ffffff'], ['Cittadella', '#7a1f3d', '#ffffff'], ['Cosenza', '#c8102e', '#1d4fa0'], ['Pescara', '#7fb2e5', '#ffffff'],
        ['Catania', '#c8102e', '#1d4fa0'], ['Crotone', '#c8102e', '#1d4fa0'], ['Perugia', '#c8102e', '#ffffff'], ['Ternana', '#2f7a3a', '#c8102e'],
        ['Triestina', '#c8102e', '#ffffff'], ['Foggia', '#c8102e', '#111111'], ['Novara', '#1d4fa0', '#ffffff'], ['Lucchese', '#c8102e', '#111111'],
        ['Rimini', '#c8102e', '#ffffff'], ['Trapani', '#7a1f3d', '#ffffff'], ['Feralpisalò', '#1d4fa0', '#2f7a3a'], ['Alessandria', '#a0a0a0', '#111111'],
      ] },
      { name: 'Serie D', country: 'Italia', flag: 'it', under: 'Serie C', k: 4, wealth: 0.2, rep: 59.5, clubs: [
        ['Livorno', '#7a1f3d', '#ffffff'], ['Reggina', '#7a1f3d', '#ffffff'], ['Ancona', '#c8102e', '#ffffff'], ['Messina', '#c8102e', '#f4d40b'],
        ['Taranto', '#c8102e', '#1d4fa0'], ['Siracusa', '#1d4fa0', '#ffffff'], ['Piacenza', '#c8102e', '#ffffff'], ['Varese', '#c8102e', '#ffffff'],
        ['Fidelis Andria', '#2f7a3a', '#ffffff'], ['Nocerina', '#c8102e', '#111111'], ['Casertana', '#c8102e', '#1d4fa0'], ['Sanremese', '#1d4fa0', '#ffffff'],
        ['Savona', '#ffffff', '#1d4fa0'], ['Treviso', '#7a1f3d', '#ffffff'], ['Pistoiese', '#f37021', '#ffffff'], ['Prato', '#1d4fa0', '#ffffff'],
        ['Sambenedettese', '#c8102e', '#1d4fa0'], ['Teramo', '#c8102e', '#ffffff'], ['Matera', '#1d4fa0', '#2f7a3a'], ['Turris', '#c8102e', '#ffffff'],
      ] },
      { name: 'Regionalliga', country: 'Alemania', flag: 'de', under: '3. Liga', k: 4, wealth: 0.24, rep: 60, clubs: [
        ['TSV 1860 München', '#7fb2e5', '#ffffff'], ['Erzgebirge Aue', '#7a1f3d', '#ffffff'], ['SV Sandhausen', '#ffffff', '#111111'], ['Hallescher FC', '#c8102e', '#ffffff'],
        ['Kickers Offenbach', '#c8102e', '#ffffff'], ['FC Carl Zeiss Jena', '#1d4fa0', '#f4d40b'], ['1. FC Lok Leipzig', '#1d4fa0', '#f4d40b'], ['Chemnitzer FC', '#7fb2e5', '#ffffff'],
        ['SpVgg Unterhaching', '#c8102e', '#1d4fa0'], ['BFC Dynamo', '#7a1f3d', '#ffffff'], ['Rot-Weiß Oberhausen', '#c8102e', '#ffffff'], ['Wuppertaler SV', '#c8102e', '#1d4fa0'],
        ['FC 08 Homburg', '#2f7a3a', '#ffffff'], ['VfB Oldenburg', '#1d4fa0', '#ffffff'], ['SpVgg Bayreuth', '#f4d40b', '#111111'], ['FSV Frankfurt', '#1d4fa0', '#111111'],
        ['Eintracht Trier', '#ffffff', '#1d4fa0'], ['TSV Steinbach Haiger', '#c8102e', '#ffffff'],
      ] },
      { name: 'National', country: 'Francia', flag: 'fr', under: 'Ligue 2 BKT', k: 3, wealth: 0.3, rep: 62.5, clubs: [
        ['Girondins de Bordeaux', '#1d2f5f', '#ffffff'], ['SC Bastia', '#1d4fa0', '#ffffff'], ['AC Ajaccio', '#c8102e', '#ffffff'], ['Amiens SC', '#ffffff', '#111111'],
        ['Stade Malherbe Caen', '#1d4fa0', '#c8102e'], ['Valenciennes FC', '#c8102e', '#ffffff'], ['Nîmes Olympique', '#c8102e', '#ffffff'], ['US Quevilly-Rouen', '#c8102e', '#f4d40b'],
        ['FC Rouen 1899', '#c8102e', '#ffffff'], ['FC Versailles', '#1d4fa0', '#ffffff'], ['US Concarneau', '#c8102e', '#1d4fa0'], ['US Orléans', '#1d4fa0', '#f4d40b'],
        ['FC Bourg-Péronnas', '#c8102e', '#ffffff'], ['LB Châteauroux', '#1d4fa0', '#ffffff'], ['FC Villefranche', '#1d4fa0', '#ffffff'], ['Aubagne FC', '#c8102e', '#ffffff'],
        ['Stade Briochin', '#c8102e', '#ffffff'], ['FC Fleury 91', '#f4d40b', '#1d4fa0'],
      ] },
      { name: 'National 2', country: 'Francia', flag: 'fr', under: 'National', k: 3, wealth: 0.2, rep: 58.5, clubs: [
        ['CS Sedan Ardennes', '#c8102e', '#2f7a3a'], ['US Créteil-Lusitanos', '#1d4fa0', '#f4d40b'], ['SO Cholet', '#c8102e', '#ffffff'], ['AS Beauvais', '#c8102e', '#ffffff'],
        ['SC Toulon', '#f4d40b', '#1d4fa0'], ['US Saint-Malo', '#c8102e', '#ffffff'], ['Vannes OC', '#c8102e', '#ffffff'], ['FC Chambly', '#111111', '#ffffff'],
        ['Lyon-La Duchère', '#1d4fa0', '#ffffff'], ['SR Colmar', '#1d4fa0', '#ffffff'], ['Le Puy Foot', '#c8102e', '#111111'], ['Bergerac Périgord', '#1d4fa0', '#ffffff'],
        ['Marignane Gignac', '#1d4fa0', '#ffffff'], ['ES Fréjus Saint-Raphaël', '#c8102e', '#1d4fa0'], ['Hyères FC', '#f4d40b', '#111111'], ['SAS Épinal', '#f4d40b', '#111111'],
        ['Paris 13 Atletico', '#1d4fa0', '#ffffff'], ['US Avranches', '#1d4fa0', '#ffffff'],
      ] },
      { name: 'Liga Portugal 2', country: 'Portugal', flag: 'pt', under: 'Liga Portugal', k: 2, wealth: 0.4, rep: 65, clubs: [
        ['Boavista FC', '#111111', '#ffffff'], ['FC Paços de Ferreira', '#f4d40b', '#2f7a3a'], ['CD Tondela', '#f4d40b', '#2f7a3a'], ['FC Vizela', '#1d4fa0', '#ffffff'],
        ['Portimonense SC', '#111111', '#ffffff'], ['SC Farense', '#111111', '#ffffff'], ['GD Chaves', '#c8102e', '#1d4fa0'], ['AVS Futebol', '#c8102e', '#ffffff'],
        ['Leixões SC', '#c8102e', '#ffffff'], ['CD Feirense', '#1d4fa0', '#ffffff'], ['UD Leiria', '#c8102e', '#ffffff'], ['Académica de Coimbra', '#111111', '#ffffff'],
        ['FC Penafiel', '#c8102e', '#111111'], ['UD Oliveirense', '#c8102e', '#111111'], ['SCU Torreense', '#c8102e', '#ffffff'], ['CD Mafra', '#c8102e', '#ffffff'],
        ['FC Felgueiras', '#c8102e', '#1d4fa0'], ['Lusitânia Lourosa', '#1d4fa0', '#ffffff'],
      ] },
      { name: 'Keuken Kampioen Divisie', country: 'Países Bajos', flag: 'nl', under: 'Eredivisie', k: 2, wealth: 0.42, rep: 64.5, clubs: [
        ['Vitesse', '#f4d40b', '#111111'], ['NAC Breda', '#f4d40b', '#111111'], ['Heracles Almelo', '#111111', '#ffffff'], ['RKC Waalwijk', '#f4d40b', '#1d4fa0'],
        ['Almere City FC', '#c8102e', '#111111'], ['De Graafschap', '#1d4fa0', '#ffffff'], ['Roda JC', '#f4d40b', '#111111'], ['FC Volendam', '#f37021', '#111111'],
        ['FC Den Bosch', '#c8102e', '#ffffff'], ['FC Dordrecht', '#c8102e', '#ffffff'], ['FC Emmen', '#c8102e', '#ffffff'], ['VVV-Venlo', '#f4d40b', '#111111'],
        ['MVV Maastricht', '#c8102e', '#ffffff'], ['Helmond Sport', '#f37021', '#111111'], ['TOP Oss', '#c8102e', '#ffffff'], ['FC Eindhoven', '#1d4fa0', '#ffffff'],
        ["Achilles '29", '#1d4fa0', '#ffffff'], ['Quick Boys', '#1d4fa0', '#ffffff'],
      ] },
      { name: 'Trendyol 1. Lig', country: 'Turquía', flag: 'tr', under: 'Trendyol Süper Lig', k: 3, wealth: 0.42, rep: 65.5, clubs: [
        ['Antalyaspor', '#c8102e', '#ffffff'], ['Kayserispor', '#c8102e', '#f4d40b'], ['Sivasspor', '#c8102e', '#ffffff'], ['Bursaspor', '#2f7a3a', '#ffffff'],
        ['Hatayspor', '#7a1f3d', '#ffffff'], ['Adana Demirspor', '#1d4fa0', '#7fb2e5'], ['Bodrum FK', '#2f7a3a', '#ffffff'], ['MKE Ankaragücü', '#f4d40b', '#1d4fa0'],
        ['Sakaryaspor', '#2f7a3a', '#111111'], ['Bandırmaspor', '#c8102e', '#1d4fa0'], ['Boluspor', '#c8102e', '#ffffff'], ['Pendikspor', '#c8102e', '#ffffff'],
        ['Manisa FK', '#111111', '#ffffff'], ['Iğdır FK', '#1d4fa0', '#ffffff'], ['Ümraniyespor', '#c8102e', '#ffffff'], ['Keçiörengücü', '#7a1f3d', '#ffffff'],
        ['Altay', '#111111', '#ffffff'], ['Adanaspor', '#f37021', '#ffffff'],
      ] },
      { name: 'Scottish Championship', country: 'Escocia', flag: 'gb-sct', under: 'Scottish Premiership', k: 1, wealth: 0.3, rep: 61.5, clubs: [
        ['Ross County', '#1d2f5f', '#ffffff'], ['Livingston', '#f4d40b', '#111111'], ['Partick Thistle', '#c8102e', '#f4d40b'], ['Dunfermline Athletic', '#111111', '#ffffff'],
        ['Ayr United', '#ffffff', '#111111'], ['Greenock Morton', '#1d4fa0', '#ffffff'], ['Raith Rovers', '#1d4fa0', '#ffffff'], ["Queen's Park", '#111111', '#ffffff'],
        ['Airdrieonians', '#ffffff', '#c8102e'], ['Arbroath', '#7a1f3d', '#ffffff'],
      ] },
      { name: 'Challenger Pro League', country: 'Bélgica', flag: 'be', under: '1A Pro League', k: 2, wealth: 0.38, rep: 64, clubs: [
        ['Beerschot', '#5b2a86', '#ffffff'], ['KAS Eupen', '#ffffff', '#1d4fa0'], ['RWDM Brussels', '#c8102e', '#ffffff'], ['KV Oostende', '#c8102e', '#f4d40b'],
        ['Lierse SK', '#f4d40b', '#111111'], ['RFC Seraing', '#c8102e', '#111111'], ['Patro Eisden', '#f4d40b', '#111111'], ['RFC Liège', '#c8102e', '#1d4fa0'],
        ['KSC Lokeren-Temse', '#f4d40b', '#111111'], ['Francs Borains', '#c8102e', '#ffffff'], ['Royal Excel Mouscron', '#c8102e', '#1d4fa0'], ['Olympic Charleroi', '#111111', '#ffffff'],
        ['RAEC Mons', '#c8102e', '#ffffff'], ['KMSK Deinze', '#c8102e', '#111111'], ['K. Dessel Sport', '#f4d40b', '#111111'], ['KSV Roeselare', '#1d4fa0', '#ffffff'],
      ] },
    ],
    F: [
      { name: 'WSL 2', country: 'Inglaterra', flag: 'gb-eng', under: 'Barclays WSL', k: 1, wealth: 0.6, rep: 69, clubs: [
        ['Bristol City', '#c8102e', '#ffffff'], ['Newcastle United', '#111111', '#ffffff'], ['Durham', '#3a7fbf', '#ffffff'], ['Sunderland', '#c8102e', '#ffffff'],
        ['Southampton', '#c8102e', '#ffffff'], ['Sheffield United', '#c8102e', '#ffffff'], ['Nottingham Forest', '#c8102e', '#ffffff'], ['Ipswich Town', '#1d4fa0', '#ffffff'],
        ['Portsmouth', '#1d4fa0', '#ffffff'], ['Reading', '#1d4fa0', '#ffffff'], ['Blackburn Rovers', '#1d4fa0', '#ffffff'], ['Lewes', '#c8102e', '#111111'],
      ] },
      { name: '2. Frauen-Bundesliga', country: 'Alemania', flag: 'de', under: 'GPFBL', k: 2, wealth: 0.5, rep: 67, clubs: [
        ['Turbine Potsdam', '#1d4fa0', '#ffffff'], ['Borussia Mönchengladbach', '#ffffff', '#111111'], ['Hertha BSC', '#1d4fa0', '#ffffff'], ['SC Sand', '#1d4fa0', '#ffffff'],
        ['FC Carl Zeiss Jena', '#1d4fa0', '#f4d40b'], ['SG Andernach', '#1d4fa0', '#ffffff'], ['FC Ingolstadt 04', '#c8102e', '#111111'], ['VfL Bochum', '#1d4fa0', '#ffffff'],
        ['SV Meppen', '#1d4fa0', '#ffffff'], ['Arminia Bielefeld', '#1d4fa0', '#111111'], ['MSV Duisburg', '#1d4fa0', '#ffffff'], ['FSV Gütersloh', '#1d4fa0', '#ffffff'],
        ['Eintracht Braunschweig', '#f4d40b', '#1d4fa0'], ['SV 67 Weinberg', '#c8102e', '#ffffff'],
      ] },
      { name: 'Primera Federación Femenina', country: 'España', flag: 'es', under: 'Liga F Moeve', k: 2, wealth: 0.45, rep: 66, clubs: [
        ['Real Betis', '#0bb363', '#ffffff'], ['Levante UD', '#1d4fa0', '#a50044'], ['Villarreal CF', '#f4d40b', '#1d4fa0'], ['CA Osasuna', '#c8102e', '#1d2f5f'],
        ['Málaga CF', '#1d4fa0', '#ffffff'], ['Getafe CF', '#1d4fa0', '#ffffff'], ['Rayo Vallecano', '#ffffff', '#c8102e'], ['Alhama CF', '#c8102e', '#ffffff'],
        ['Real Oviedo', '#1d4fa0', '#ffffff'], ['Real Sporting', '#c8102e', '#ffffff'], ['Real Zaragoza', '#ffffff', '#1d4fa0'], ['CD Castellón', '#ffffff', '#111111'],
        ['Sporting de Huelva', '#1d4fa0', '#ffffff'], ['Albacete BP', '#ffffff', '#c8102e'], ['R. Valladolid CF', '#5b2a86', '#ffffff'], ['Real Unión', '#ffffff', '#1a1a1a'],
      ] },
      { name: 'Seconde Ligue', country: 'Francia', flag: 'fr', under: 'Arkema PL', k: 2, wealth: 0.42, rep: 65, clubs: [
        ['LOSC Lille', '#c8102e', '#ffffff'], ['Girondins de Bordeaux', '#1d2f5f', '#ffffff'], ['AS Saint-Étienne', '#2f7a3a', '#ffffff'], ['Stade de Reims', '#c8102e', '#ffffff'],
        ['Stade Brestois 29', '#c8102e', '#ffffff'], ['Dijon FCO', '#c8102e', '#ffffff'], ['OGC Nice', '#c8102e', '#111111'], ['FC Metz', '#7a1f3d', '#ffffff'],
        ['Rodez AF', '#c8102e', '#f4d40b'], ['Le Mans FC', '#c8102e', '#f4d40b'], ['Grenoble Foot 38', '#1d4fa0', '#ffffff'], ['AS Nancy Lorraine', '#c8102e', '#ffffff'],
      ] },
    ],
  },
};
