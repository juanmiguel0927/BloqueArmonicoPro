(function() {
    const el = (id) => document.getElementById(id);

    function createEmptySession() {
        return {
            startTime: Date.now(), exercises: 0, correct: 0, incorrect: 0,
            xpEarned: 0, bestSessionStreak: 0, currentSessionStreak: 0,
            badgesUnlockedInSession: [],
            totalTimeSec: 0, timedCount: 0, exercisesLog: []
        };
    }

    const state = {
        currentUser: "Invitado",
        correctNotes: [],
        correctNotesWithOctave: [],
        chordRoot: 'C',
        chordTypeKey: 'maj7',
        forcedChordTypeKey: 'auto',
        givenLabel: '3',
        givenNote: 'E',
        givenNoteWithOctave: 'E/5',
        studioHarmonicBlockVisible: false,
        orderedLabelsForDisplay: ['3', '1', '7', '5'],
        selectedUserNotes: ['E/5'],
        editingCellIndex: null,
        validatedCells: [null, null, null, null, null],
        exerciseSolved: false,
        failedCurrentExercise: false,
        stats: {
            totalExercises: 0, totalCorrect: 0, totalIncorrect: 0,
            currentStreak: 0, bestStreak: 0,
            dailyStreak: 0, lastPracticeDate: null,
            xp: 0, tutorialSeen: false,
            unlockedBadges: [], chordBreakdown: {}, errorBank: [],
            totalResponseTimeSec: 0, timedExercisesCount: 0,
            pastSessions: [], continuityHistory: [], progressionHistory: [],
            competencies: {
                close4Way: { correct: 0, total: 0 },
                openDropsSpreads: { correct: 0, total: 0 },
                melodicApproaches: { correct: 0, total: 0 },
                continuity8C: { correct: 0, total: 0 },
                earDictation: { correct: 0, total: 0 }
            }
        },
        evaluation: {
            exercisesPerEval: 5,
            questionsAttemptedInBatch: 0,
            batchCorrectFirstTry: 0,
            batchIncorrect: 0,
            batchTotalTimeSec: 0,
            batchChordsFailed: {}
        },
        currentSession: createEmptySession(),
        difficulty: 'intermediate',
        notationSystem: 'american',
        instrument: 'piano',
        voicingType: 'close',
        includeBass: false,
        staffMode: 'grand',
        strictEnharmonic: false,
        dictationMode: false,
        errorReviewMode: false,
        isCustomChallenge: false,
        continuityMode: false,
        continuity: {
            measures: [],
            currentBar: 0,
            giveInitialNote: true,
            previousVoicesWithOctave: [],
            commonVoiceIndices: [],
            linkExplanation: '',
            runHits: 0,
            runErrors: 0,
            runRetries: 0,
            viewingHistoryIdx: -1
        },
        customPractice: {
            basic: { isActive: false, allowedChords: [], allowedLeads: [] },
            intermediate: { isActive: false, allowedChords: [], allowedLeads: [] },
            advanced: { isActive: false, allowedChords: [], allowedLeads: [] }
        },
        timer: {
            limitSeconds: 0,
            exerciseStartTime: Date.now(),
            intervalId: null,
            sessionLimitMinutes: 0,
            sessionEndTime: null
        },
        tutorial: { currentStep: 0 },
        darkMode: false,
        audioContextStarted: false,
        lastRenderedStaves: { treble: null, bass: null, useGrand: true },
        melodicStudio: {
            isActive: false,
            barsCount: 4,
            exampleId: 'f3_4_1',
            selectedNoteIdx: null,
            stepByStepMode: false,
            voicingDisposition: 'close',
            voicingDispositionByNote: {},
            tempoBpm: 105,
            measuresPerRowMode: 2,
            floatingDockSide: 'right',
            showSeparateIndLead: false,
            showSeparateTonic: false,
            selectedMultiPermutationsByNote: {},
            selectedClassificationByNote: {},
            selectedHarmonizationByNote: {},
            autoFilledPhraseVoicings: {},
            enharmonicNoteSpellingByNote: {},
            manuallyClearedNotes: {},
            scoreZoomPercent: 100,
            autoFillSeed: 0,
            showFullVoicingInScore: true,
            approachNotation: 'd',
            scoreAnnotationMode: 'both',
            isPlayingPhrase: false,
            phraseTimers: [],
            groupPreviewTimers: [],
            noteHitBoxes: [],
            customRandomExamples: {},
            customEditorDraft: { barsCount: 4, timeSigNum: 4, timeSigDen: 4, activeBarIdx: 0, activeNoteIdx: -1, noteHitBoxes: [], measures: [] },
            undoStack: [],
            redoStack: [],
            swingMode: 'straight',
            metronomeActive: false,
            isLoopingBar: false,
            showVoiceLeadingLines: false
        }
    };

    const DEFAULT_STATS = JSON.parse(JSON.stringify(state.stats));

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function reportProfileStorageError(action, error) {
        console.error(`No se pudo ${action} los datos del perfil:`, error);
        showFeedbackBanner(`❌ No se pudieron ${action} los datos del perfil. Comprueba el almacenamiento del navegador.`, 'error');
    }

    const BADGES_CATALOG = [
        { id: 'first_chord', icon: '🎵', title: 'Primer Bloque', desc: 'Armoniza tu primer acorde correctamente.' },
        { id: 'triad_master', icon: '🎹', title: 'Maestro del 4-Way Close', desc: 'Acumula 10 aciertos en total.' },
        { id: 'streak_3', icon: '🔥', title: 'Constancia Diaria', desc: 'Alcanza una racha diaria o de sesión de 3 o más.' },
        { id: 'continuity_8c', icon: '🎼', title: 'Enlace de 8 Compases', desc: 'Completa los 8 compases de Continuidad Armónica.' },
        { id: 'tension_explorer', icon: '🚀', title: 'Domador de Tensiones', desc: 'Resuelve un acorde con tensiones en nivel Avanzado.' },
        { id: 'custom_creator', icon: '🛠️', title: 'Estudio de Repertorio', desc: 'Crea y resuelve un ejercicio con el Creador de Retos a Medida.' },
        { id: 'ear_master', icon: '👂', title: 'Oído Armónico', desc: 'Resuelve un acorde en Modo Dictado Auditivo.' },
        { id: 'drop_arranger', icon: '🎷', title: 'Arreglista de Big Band', desc: 'Resuelve un acorde en Spread, Drop, Ambi Chord o con Bajo.' }
    ];

    function getTodayDateString() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function getYesterdayDateString() {
        const d = new Date(Date.now() - 86400000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Actualiza la racha diaria por realización diaria
    function registerDailyPracticeActivity() {
        const today = getTodayDateString();
        const yesterday = getYesterdayDateString();
        if (state.stats.lastPracticeDate === today) {
            if (!state.stats.dailyStreak || state.stats.dailyStreak < 1) state.stats.dailyStreak = 1;
        } else if (state.stats.lastPracticeDate === yesterday) {
            state.stats.dailyStreak = (state.stats.dailyStreak || 0) + 1;
            state.stats.lastPracticeDate = today;
        } else {
            state.stats.dailyStreak = 1;
            state.stats.lastPracticeDate = today;
        }
    }

    // Catálogo de Relación Escala - Acorde y Análisis Armónico Contextual Ampliado (con soporte para todas las especies)
    const CHORD_SCALE_CONTEXT_CATALOG = {
        "maj7": [
            { id: "ionian", name: "Jónica (Imaj7)", func: "Imaj7 (Tónica Mayor)", semitones: [0, 2, 4, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "13", "7"], availTensions: ["9", "13"], avoid: ["11"] },
            { id: "lydian", name: "Lidia (IVmaj7 / bIImaj7 / bVImaj7)", func: "IVmaj7 / Subdominante o Intercambio Modal", semitones: [0, 2, 4, 6, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "#11", "5", "13", "7"], availTensions: ["9", "#11", "13"], avoid: [] },
            { id: "lydian_s9", name: "Lidia #9 (6to modo menor armónica)", func: "Maj7 Colorido No-Diatónico", semitones: [0, 3, 4, 6, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "#9", "3", "#11", "5", "13", "7"], availTensions: ["#9", "#11", "13"], avoid: [] }
        ],
        "major": [
            { id: "ionian", name: "Jónica (I / Tríada Tónica)", func: "I (Tónica Mayor)", semitones: [0, 2, 4, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "6", "7"], availTensions: ["9", "6"], avoid: ["11"] },
            { id: "lydian", name: "Lidia (IV / Subdominante)", func: "IV (Subdominante Mayor)", semitones: [0, 2, 4, 6, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "#11", "5", "6", "7"], availTensions: ["9", "#11", "6"], avoid: [] }
        ],
        "6": [
            { id: "ionian", name: "Jónica (I6 / Tónica Mayor)", func: "I6 (Tónica Mayor)", semitones: [0, 2, 4, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "6", "7"], availTensions: ["9", "11", "6"], avoid: ["11"] },
            { id: "lydian", name: "Lidia (IV6 / Subdominante)", func: "IV6 Subdominante Mayor", semitones: [0, 2, 4, 6, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "#11", "5", "6", "7"], availTensions: ["9", "#11", "6"], avoid: [] }
        ],
        "m7": [
            { id: "dorian", name: "Dórica (IIm7 / IVm7)", func: "IIm7 (Subdominante Menor)", semitones: [0, 2, 3, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "13", "b7"], availTensions: ["9", "11", "13"], avoid: [] },
            { id: "aeolian", name: "Eólica (VIm7 / Tónica Menor)", func: "VIm7 (Relativo Menor)", semitones: [0, 2, 3, 5, 7, 8, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "b13", "b7"], availTensions: ["9", "11"], avoid: ["b13"] },
            { id: "phrygian", name: "Frigia (IIIm7)", func: "IIIm7 (Modal / Mediante)", semitones: [0, 1, 3, 5, 7, 8, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "b9", "b3", "11", "5", "b13", "b7"], availTensions: ["11"], avoid: ["b9", "b13"] },
            { id: "dorian_s4", name: "Dórica #4 (4to modo menor melódica)", func: "IVm7 / IIm7 Color Melódico", semitones: [0, 2, 3, 6, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "#11", "5", "13", "b7"], availTensions: ["9", "#11", "13"], avoid: [] }
        ],
        "minor": [
            { id: "dorian", name: "Dórica (Im6 / IIm)", func: "Im6 / IIm", semitones: [0, 2, 3, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "6", "b7"], availTensions: ["9", "11", "6"], avoid: [] },
            { id: "melodic_minor", name: "Menor Melódica (ImMaj7 / Im6)", func: "Im (Tónica Menor)", semitones: [0, 2, 3, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "6", "7"], availTensions: ["9", "11", "6"], avoid: [] }
        ],
        "m6": [
            { id: "dorian", name: "Dórica (Im6 / Menor Jazz)", func: "Im6 / IIm6", semitones: [0, 2, 3, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "6", "b7"], availTensions: ["9", "11", "6"], avoid: [] },
            { id: "melodic_minor", name: "Menor Melódica (Im6 Tónica)", func: "Im6 (Tónica Menor)", semitones: [0, 2, 3, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "6", "7"], availTensions: ["9", "11", "6"], avoid: [] }
        ],
        "mMaj7": [
            { id: "melodic_minor", name: "Menor Melódica (ImMaj7)", func: "Im(maj7) Tónica Menor", semitones: [0, 2, 3, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "13", "7"], availTensions: ["9", "11", "13"], avoid: [] },
            { id: "harmonic_minor", name: "Menor Armónica (ImMaj7)", func: "Im(maj7) Menor Armónica", semitones: [0, 2, 3, 5, 7, 8, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "b13", "7"], availTensions: ["9", "11"], avoid: ["b13"] }
        ],
        "m7b5": [
            { id: "locrian", name: "Locria (VIIm7b5)", func: "VIIm7(b5) Diatónico", semitones: [0, 1, 3, 5, 6, 8, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "b9", "b3", "11", "b5", "b13", "b7"], availTensions: ["11", "b13"], avoid: ["b9"] },
            { id: "locrian_nat6", name: "Locrio ♮6 (2do modo menor armónico)", func: "IIm7(b5) en Modo Menor", semitones: [0, 1, 3, 5, 6, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "b9", "b3", "11", "b5", "13", "b7"], availTensions: ["11", "13"], avoid: ["b9"] },
            { id: "locrian_nat2", name: "Locrio ♮2 (6to modo menor melódico)", func: "IIm7(b5) / VIm7(b5) Sin Nota a Evitar", semitones: [0, 2, 3, 5, 6, 8, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "b5", "b13", "b7"], availTensions: ["9", "11", "b13"], avoid: [] }
        ],
        "7": [
            { id: "mixolydian", name: "Mixolidia (V7 / I7 / V7/IV / V7/V)", func: "V7 Dominante Diatónico", semitones: [0, 2, 4, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "13", "b7"], availTensions: ["9", "13"], avoid: ["11"] },
            { id: "mixolydian_s4", name: "Mixolidio #4 (SubV7 / bVII7 / IV7)", func: "SubV7 Sustituto Tritonal / bVII7", semitones: [0, 2, 4, 6, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "#11", "5", "13", "b7"], availTensions: ["9", "#11", "13"], avoid: [] },
            { id: "mixolydian_b13", name: "Mixolidia b13 (V7/II-)", func: "V7 Secundario hacia Menor", semitones: [0, 2, 4, 5, 7, 8, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "b13", "b7"], availTensions: ["9", "b13"], avoid: ["11"] },
            { id: "mixolydian_b9b13", name: "Mixolidia b9 b13 (V7/III-, V7/VI-, V7/II-)", func: "V7 Secundario (5to modo menor armónica)", semitones: [0, 1, 4, 5, 7, 8, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "b9", "3", "11", "5", "b13", "b7"], availTensions: ["b9", "b13"], avoid: ["11"] },
            { id: "altered", name: "Alterada (7mo modo menor melódica)", func: "V7alt Dominante Alterado", semitones: [0, 1, 3, 4, 6, 8, 10], degs: [0, 1, 1, 2, 3, 5, 6], labels: ["1", "b9", "#9", "3", "#11", "b13", "b7"], availTensions: ["b9", "#9", "#11", "b13"], avoid: [] },
            { id: "half_whole", name: "Semitono-Tono (Simétrica Disminuida)", func: "V7(b9,13) Dominante Simétrico", semitones: [0, 1, 3, 4, 6, 7, 9, 10], degs: [0, 1, 1, 2, 3, 4, 5, 6], labels: ["1", "b9", "#9", "3", "#11", "5", "13", "b7"], availTensions: ["b9", "#9", "#11", "13"], avoid: [] },
            { id: "whole_tone", name: "Tonos Enteros (Hexatónica)", func: "V7(#5,#11)", semitones: [0, 2, 4, 6, 8, 10], degs: [0, 1, 2, 3, 5, 6], labels: ["1", "9", "3", "#11", "b13", "b7"], availTensions: ["9", "#11", "b13"], avoid: [] }
        ],
        "7sus4": [
            { id: "mixolydian", name: "Mixolidia (V7sus4)", func: "V7sus4 Dominante Suspendido", semitones: [0, 2, 4, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "13", "b7"], availTensions: ["9", "13", "11"], avoid: [] },
            { id: "dorian", name: "Dórica (IIm7 / V7sus4)", func: "IIm7 / Suspendido Subdominante", semitones: [0, 2, 3, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "b3", "11", "5", "13", "b7"], availTensions: ["9", "11", "13"], avoid: [] }
        ],
        "sus4": [
            { id: "mixolydian", name: "Mixolidia Sus4", func: "V(sus4) Dominante Suspendido", semitones: [0, 2, 4, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "4", "5", "13", "b7"], availTensions: ["9", "13"], avoid: [] },
            { id: "ionian", name: "Jónica Sus4", func: "I(sus4) Tónica Suspendida", semitones: [0, 2, 4, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "4", "5", "13", "7"], availTensions: ["9", "13"], avoid: [] }
        ],
        "sus2": [
            { id: "ionian", name: "Jónica Sus2", func: "I(sus2) Tónica Suspendida 2", semitones: [0, 2, 4, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "2", "3", "11", "5", "13", "7"], availTensions: ["2", "13"], avoid: ["11"] },
            { id: "mixolydian", name: "Mixolidia Sus2", func: "V(sus2) Dominante Suspendido 2", semitones: [0, 2, 4, 5, 7, 9, 10], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "2", "3", "11", "5", "13", "b7"], availTensions: ["2", "13"], avoid: ["11"] }
        ],
        "augmented": [
            { id: "whole_tone", name: "Tonos Enteros (Hexatónica Aumentada)", func: "V+ / I+ Acorde Aumentado", semitones: [0, 2, 4, 6, 8, 10], degs: [0, 1, 2, 3, 5, 6], labels: ["1", "9", "3", "#11", "#5", "b7"], availTensions: ["9", "#11"], avoid: [] }
        ],
        "diminished": [
            { id: "whole_half", name: "Tono-Semitono (Simétrica Disminuida)", func: "Tríada Disminuida", semitones: [0, 2, 3, 5, 6, 8, 9, 11], degs: [0, 1, 2, 3, 4, 5, 5, 6], labels: ["1", "9", "b3", "11", "b5", "b13", "6", "7"], availTensions: ["9", "11", "7"], avoid: [] }
        ],
        "dim7": [
            { id: "whole_half", name: "Tono-Semitono (Simétrica Disminuida)", func: "vii°7 / #iv°7 Disminuido de Paso", semitones: [0, 2, 3, 5, 6, 8, 9, 11], degs: [0, 1, 2, 3, 4, 5, 5, 6], labels: ["1", "9", "b3", "11", "b5", "b13", "6", "7"], availTensions: ["9", "11", "b13", "7"], avoid: [] },
            { id: "harm_min_7", name: "7mo modo menor armónica (+7M)", func: "vii°7 Sensible Diatónica", semitones: [0, 1, 3, 4, 6, 8, 9, 11], degs: [0, 1, 2, 2, 4, 5, 5, 6], labels: ["1", "b9", "b3", "b10", "b5", "b13", "6", "7"], availTensions: ["b9", "b13", "7"], avoid: [] }
        ]
    };

    // Detecta automáticamente la función armónica contextual y la escala recomendada entre acordes consecutivos
    function inferContextualScaleAndFunction(chordRoot, chordTypeKey, nextChordRoot = null, nextChordTypeKey = null, explicitScaleId = null) {
        const list = CHORD_SCALE_CONTEXT_CATALOG[chordTypeKey] || CHORD_SCALE_CONTEXT_CATALOG["maj7"] || [];
        if (explicitScaleId && list.length) {
            const found = list.find(s => s.id === explicitScaleId);
            if (found) return found;
        }
        if (nextChordRoot && chordTypeKey === '7') {
            const diffToNext = ((getNoteSemitone(nextChordRoot) - getNoteSemitone(chordRoot)) % 12 + 12) % 12;
            const isNextMinor = nextChordTypeKey === 'm7' || nextChordTypeKey === 'minor';
            if (diffToNext === 11) {
                // Resolviendo 1 semitono abajo: Sustituto Tritonal SubV7 -> Mixolidio #4
                return list.find(s => s.id === 'mixolydian_s4') || list[0];
            }
            if (diffToNext === 2 && (nextChordTypeKey === 'maj7' || nextChordTypeKey === 'major')) {
                // bVII7 -> I (Backdoor) -> Mixolidio #4
                return list.find(s => s.id === 'mixolydian_s4') || list[0];
            }
            if (diffToNext === 5 && isNextMinor) {
                // V7 hacia acorde menor (V7/II-, V7/III-, V7/VI-) -> Mixolidia b9 b13
                return list.find(s => s.id === 'mixolydian_b9b13') || list[0];
            }
        }
        if (chordTypeKey === 'm7b5' && list.length) {
            return list.find(s => s.id === 'locrian_nat2') || list[0];
        }
        return list[0] || { id: "ionian", name: "Jónica", func: "Tónica Mayor", semitones: [0, 2, 4, 5, 7, 9, 11], degs: [0, 1, 2, 3, 4, 5, 6], labels: ["1", "9", "3", "11", "5", "13", "7"], availTensions: ["9", "13"], avoid: ["11"] };
    }

    // Catálogo de técnicas de armonización y análisis melódico
    const HARMONIZATION_TECHNIQUES_CATALOG = {
        "principal_4way": { id: "principal_4way", abbr: "4-WC", shortName: "4-Way Close", category: "1. Bloque cerrado y variantes", isStandaloneAllowed: true, desc: "Cuatro voces distintas dentro de una octava: fundamental, séptima, quinta y tercera." },
        "principal_var1": { id: "principal_var1", abbr: "V1", shortName: "Variante 1: dos guías y una tensión", category: "1. Bloque cerrado y variantes", isStandaloneAllowed: true, desc: "Melodía + dos notas guía + una nota no guía o tensión. Ejemplo: C#–B–G–E sobre A7." },
        "principal_var2": { id: "principal_var2", abbr: "V2", shortName: "Variante 2: una guía y dos tensiones", category: "1. Bloque cerrado y variantes", isStandaloneAllowed: true, desc: "Melodía + una nota guía + dos notas no guía o tensiones. Ejemplo: C#–G–F#–E sobre A7." },
        "principal_var3": { id: "principal_var3", abbr: "V3", shortName: "Variante 3: guía en la melodía", category: "1. Bloque cerrado y variantes", isStandaloneAllowed: true, desc: "Melodía en una nota guía + guía faltante + dos notas no guía. Ejemplo: C#–G–E–A sobre A7." },
        "ambi_a": { id: "ambi_a", abbr: "CA-A", shortName: "Cuartas ambivalentes: modelo A", category: "1b. Cuartas ambivalentes", isStandaloneAllowed: true, desc: "Según la escala del acorde: cuarta, segunda y cuarta; la cuarta voz duplica la melodía una octava abajo." },
        "ambi_b": { id: "ambi_b", abbr: "CA-B", shortName: "Cuartas ambivalentes: modelo B", category: "1b. Cuartas ambivalentes", isStandaloneAllowed: true, desc: "Según la escala del acorde: cuarta, cuarta y segunda; la cuarta voz duplica la melodía una octava abajo." },
        "ambi_c": { id: "ambi_c", abbr: "CA-C", shortName: "Cuartas ambivalentes: modelo C", category: "1b. Cuartas ambivalentes", isStandaloneAllowed: true, desc: "Según la escala del acorde: segunda, cuarta y cuarta; la cuarta voz duplica la melodía una octava abajo." },
        "chromatic_below": { id: "chromatic_below", abbr: "cr↑", shortName: "1a) Aproximación cromática ascendente", category: "2. Aproximaciones en conjunto", desc: "Las cuatro voces suben un semitono hacia el acorde objetivo." },
        "chromatic_above": { id: "chromatic_above", abbr: "cr↓", shortName: "1b) Aproximación cromática descendente", category: "2. Aproximaciones en conjunto", desc: "Las cuatro voces bajan un semitono hacia el acorde objetivo." },
        "parallel": { id: "parallel", abbr: "pa", shortName: "2) Aproximación paralela", category: "2. Aproximaciones en conjunto", desc: "Las cuatro voces se desplazan en paralelo un tono hacia el acorde objetivo." },
        "dominant": { id: "dominant", abbr: "dt(V7)", shortName: "3) Aproximación con acorde dominante", category: "2. Aproximaciones en conjunto", desc: "Un acorde V7 en posición cerrada anticipa el acorde objetivo." },
        "diatonic": { id: "diatonic", abbr: "di", shortName: "4) Aproximación diatónica", category: "2. Aproximaciones en conjunto", desc: "Las voces avanzan por grados conjuntos de la escala del momento hacia el acorde objetivo." },
        "diminished": { id: "diminished", abbr: "dm(º7)", shortName: "5) Aproximación con acorde disminuido", category: "2. Aproximaciones en conjunto", desc: "Un acorde disminuido de séptima anticipa el acorde objetivo." },
        // Resoluciones Retardadas filtradas por clasificación melódica (a, b, c, d + variantes con paralelo, disminuido y dominante)
        "del_dc": { id: "del_dc", abbr: "RR(a:DC)", shortName: "Resolución retardada a) Diatónica–cromática", category: "4. Resolución retardada", desc: "Primera nota diatónica + segunda nota cromática a un semitono del objetivo." },
        "del_cd": { id: "del_cd", abbr: "RR(b:CD)", shortName: "Resolución retardada b) Cromática–diatónica", category: "4. Resolución retardada", desc: "Primera nota cromática a un semitono + segunda nota diatónica hacia el objetivo." },
        "del_cc": { id: "del_cc", abbr: "RR(c:CC)", shortName: "Resolución retardada c) Cromática–cromática", category: "4. Resolución retardada", desc: "Dos notas cromáticas a un semitono del objetivo, en posición cerrada." },
        "del_dd": { id: "del_dd", abbr: "RR(d:DD)", shortName: "Resolución retardada d) Diatónica–diatónica", category: "4. Resolución retardada", desc: "Dos notas de la escala del momento conducen al acorde objetivo." },
        "del_dom_diat": { id: "del_dom_diat", abbr: "RR(Dt-Di)", shortName: "Variante: dominante–diatónica", category: "4. Resolución retardada", desc: "Primera nota armonizada con V7 + segunda nota diatónica hacia el objetivo." },
        "del_diat_dom": { id: "del_diat_dom", abbr: "RR(Di-Dt)", shortName: "Variante: diatónica–dominante", category: "4. Resolución retardada", desc: "Primera nota diatónica + segunda nota armonizada con V7 hacia el objetivo." },
        "del_dim_diat": { id: "del_dim_diat", abbr: "RR(Dm-Di)", shortName: "Variante: disminuida–diatónica", category: "4. Resolución retardada", desc: "Primera nota armonizada con acorde disminuido + segunda nota diatónica." },
        "del_chrom_par": { id: "del_chrom_par", abbr: "RR(Cr-Pa)", shortName: "Variante: cromática–paralela", category: "4. Resolución retardada", desc: "Primera nota cromática a un semitono + segunda nota paralela a un tono del objetivo." },
        "del_par_chrom": { id: "del_par_chrom", abbr: "RR(Pa-Cr)", shortName: "Variante: paralela–cromática", category: "4. Resolución retardada", desc: "Primera nota paralela a un tono + segunda nota cromática a un semitono del objetivo." },
        "double_chrom": { id: "double_chrom", abbr: "2Crom", shortName: "Doble cromático [c ➔ c ➔ objetivo]", category: "4. Agrupación melódica", desc: "Dos semitonos consecutivos en bloque cerrado conducen al acorde objetivo." },
        // Opciones separadas: Voz Líder Independiente Enumerada (#1 a #6)
        "ind_1": { id: "ind_1", abbr: "LI-1", shortName: "Voz líder independiente 1: sube un tono", category: "Voz líder independiente", isSeparateIndLead: true, desc: "La melodía sube un tono y las tres voces interiores suben un semitono hacia el acorde objetivo." },
        "ind_2": { id: "ind_2", abbr: "LI-2", shortName: "Voz líder independiente 2: baja un tono", category: "Voz líder independiente", isSeparateIndLead: true, desc: "La melodía baja un tono y las tres voces interiores bajan un semitono hacia el acorde objetivo." },
        "ind_3": { id: "ind_3", abbr: "LI-3", shortName: "Voz líder independiente 3: sube un semitono", category: "Voz líder independiente", isSeparateIndLead: true, desc: "La melodía sube un semitono y las tres voces interiores bajan un semitono hacia el acorde objetivo." },
        "ind_4": { id: "ind_4", abbr: "LI-4", shortName: "Voz líder independiente 4: baja un semitono", category: "Voz líder independiente", isSeparateIndLead: true, desc: "La melodía baja un semitono y las tres voces interiores suben un semitono hacia el acorde objetivo." },
        "ind_5": { id: "ind_5", abbr: "LI-5", shortName: "Voz líder independiente 5: se mantiene", category: "Voz líder independiente", isSeparateIndLead: true, desc: "La melodía repite la nota y las tres voces interiores suben un semitono hacia el acorde objetivo." },
        "ind_6": { id: "ind_6", abbr: "LI-6", shortName: "Voz líder independiente 6: se mantiene", category: "Voz líder independiente", isSeparateIndLead: true, desc: "La melodía repite la nota y las tres voces interiores bajan un semitono hacia el acorde objetivo." },
        // Catálogo Completo de Tonicizaciones de 2 y 3 Acordes (según Tonicizacion.pdf)
        "tonic_V7_I": { id: "tonic_V7_I", abbr: "Ton(V7)", shortName: "Dos acordes: V7 ➔ I / Im", category: "Tonicizaciones", isSeparateTonic: true, desc: "El dominante secundario V7 anticipa el acorde de llegada." },
        "tonic_VIIo7_I": { id: "tonic_VIIo7_I", abbr: "Ton(vii°7)", shortName: "Dos acordes: vii°7 ➔ I / Im", category: "Tonicizaciones", isSeparateTonic: true, desc: "El acorde de séptima disminuida de sensible resuelve por semitono al acorde de llegada." },
        "tonic_bII7_I": { id: "tonic_bII7_I", abbr: "Ton(bII7)", shortName: "Dos acordes: bII7 ➔ I / Im", category: "Tonicizaciones", isSeparateTonic: true, desc: "El sustituto tritonal bII7 resuelve por semitono descendente al acorde de llegada." },
        "tonic_bVII7_I": { id: "tonic_bVII7_I", abbr: "Ton(bVII7)", shortName: "Dos acordes: bVII7 ➔ I / Im", category: "Tonicizaciones", isSeparateTonic: true, desc: "El bVII7 resuelve al acorde de llegada por movimiento plagal." },
        "tonic_VII7_I": { id: "tonic_VII7_I", abbr: "Ton(VII7)", shortName: "Dos acordes: VII7 ➔ I mayor", category: "Tonicizaciones", isSeparateTonic: true, onlyMajorTarget: true, desc: "El acorde VII7 dominante sobre la sensible resuelve a un acorde mayor." },
        "tonic_II_V_I": { id: "tonic_II_V_I", abbr: "Ton(ii-V)", shortName: "Tres acordes: ii ➔ V7 ➔ I", category: "Tonicizaciones", isSeparateTonic: true, desc: "Supertónica + dominante + acorde de llegada. En menor: iiø7 ➔ V7(b9) ➔ Im." },
        "tonic_V7ofV_V_I": { id: "tonic_V7ofV_V_I", abbr: "Ton(II7-V)", shortName: "Tres acordes: II7 ➔ V7 ➔ I", category: "Tonicizaciones", isSeparateTonic: true, desc: "Dominante del dominante + dominante + acorde de llegada." },
        "tonic_II_bII_I": { id: "tonic_II_bII_I", abbr: "Ton(ii-bII)", shortName: "Tres acordes: ii ➔ bII7 ➔ I", category: "Tonicizaciones", isSeparateTonic: true, desc: "Supertónica del V seguida del sustituto tritonal bII7 hacia el acorde de llegada." },
        "tonic_bVI_bII_I": { id: "tonic_bVI_bII_I", abbr: "Ton(bVI-bII)", shortName: "Tres acordes: bVIm7 ➔ bII7 ➔ I", category: "Tonicizaciones", isSeparateTonic: true, desc: "Supertónica del bII7 seguida de bII7 hacia el acorde de llegada." },
        "tonic_IVm_bVII_I": { id: "tonic_IVm_bVII_I", abbr: "Ton(iv-bVII)", shortName: "Tres acordes: ivm7 ➔ bVII7 ➔ I mayor", category: "Tonicizaciones", isSeparateTonic: true, onlyMajorTarget: true, desc: "Cadencia plagal menor completa. Ejemplo: Fm7 ➔ Bb7 ➔ Cmaj7." },
        "tonic_sIVm7b5_VII7_I": { id: "tonic_sIVm7b5_VII7_I", abbr: "Ton(#iv-VII)", shortName: "Tres acordes: #ivm7(b5) ➔ VII7(b9) ➔ I mayor", category: "Tonicizaciones", isSeparateTonic: true, onlyMajorTarget: true, desc: "Acorde semidisminuido sobre #IV + dominante de sensible hacia el acorde mayor. Ejemplo: F#m7(b5) ➔ B7(b9) ➔ Cmaj7." },
        // Catálogo Completo de Permutaciones (Cuadros 4 y 5 de 7.pdf)
        "perm_root_9": { id: "perm_root_9", shortName: "Raíz(1) ➔ 9na", targetRole: "1", allowedTypes: ["maj7","major","m7","minor","7","m7b5"], subInt: { semitones: 2, degreeOffset: 1, label: "9" } },
        "perm_root_b9": { id: "perm_root_b9", shortName: "Raíz(1) ➔ b9", targetRole: "1", allowedTypes: ["7"], subInt: { semitones: 1, degreeOffset: 1, label: "b9" } },
        "perm_root_s9": { id: "perm_root_s9", shortName: "Raíz(1) ➔ #9", targetRole: "1", allowedTypes: ["7"], subInt: { semitones: 3, degreeOffset: 1, label: "#9" } },
        "perm_5th_s11": { id: "perm_5th_s11", shortName: "5ta ➔ #11(b5)", targetRole: "5", allowedTypes: ["maj7","major","7"], subInt: { semitones: 6, degreeOffset: 3, label: "#11" } },
        "perm_5th_11": { id: "perm_5th_11", shortName: "5ta ➔ 11na", targetRole: "5", allowedTypes: ["m7","minor","m7b5"], subInt: { semitones: 5, degreeOffset: 3, label: "11" } },
        "perm_5th_13": { id: "perm_5th_13", shortName: "5ta ➔ 13(6ta)", targetRole: "5", allowedTypes: ["maj7","major","m7","minor","7"], subInt: { semitones: 9, degreeOffset: 5, label: "13" } },
        "perm_5th_b13": { id: "perm_5th_b13", shortName: "5ta ➔ #5(b13)", targetRole: "5", allowedTypes: ["7"], subInt: { semitones: 8, degreeOffset: 5, label: "b13" } },
        "perm_3rd_9": { id: "perm_3rd_9", shortName: "Guía 3ra ➔ 9na", targetRole: "3", allowedTypes: ["maj7","major","m7","minor","7","m7b5"], subInt: { semitones: 2, degreeOffset: 1, label: "9" } },
        "perm_3rd_b9": { id: "perm_3rd_b9", shortName: "Guía 3ra ➔ b9", targetRole: "3", allowedTypes: ["7"], subInt: { semitones: 1, degreeOffset: 1, label: "b9" } },
        "perm_3rd_s9": { id: "perm_3rd_s9", shortName: "Guía 3ra ➔ #9", targetRole: "3", allowedTypes: ["7"], subInt: { semitones: 3, degreeOffset: 1, label: "#9" } },
        "perm_3rd_s11": { id: "perm_3rd_s11", shortName: "Guía 3ra ➔ #11", targetRole: "3", allowedTypes: ["maj7","major"], subInt: { semitones: 6, degreeOffset: 3, label: "#11" } },
        "perm_3rd_11": { id: "perm_3rd_11", shortName: "Guía 3ra ➔ 11na", targetRole: "3", allowedTypes: ["m7","minor","7","m7b5"], subInt: { semitones: 5, degreeOffset: 3, label: "11" } },
        "perm_7th_6": { id: "perm_7th_6", shortName: "Guía 7ma ➔ 13(6ta)", targetRole: "7", allowedTypes: ["maj7","major","m7","minor","7"], subInt: { semitones: 9, degreeOffset: 5, label: "6" } },
        "perm_7th_b13": { id: "perm_7th_b13", shortName: "Guía b7 ➔ #5(b13)", targetRole: "7", allowedTypes: ["7"], subInt: { semitones: 8, degreeOffset: 5, label: "b13" } },
        "perm_7th_b9": { id: "perm_7th_b9", shortName: "Guía b7 ➔ b9 (1ªV Fundamental)", targetRole: "7", allowedTypes: ["7"], requireLeadRoot: true, subInt: { semitones: 1, degreeOffset: 1, label: "b9" } },
        "perm_7th_9": { id: "perm_7th_9", shortName: "Guía b7 ➔ 9na", targetRole: "7", allowedTypes: ["m7b5"], subInt: { semitones: 2, degreeOffset: 1, label: "9" } }
    };

    const allRoots = ["C", "F", "G", "Bb", "Eb", "Ab", "Db", "Gb", "D", "A", "E", "B", "F#", "C#"];
    const naturalLetterSemitone = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const numberToLetterMap = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const letterToNumberMap = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
    const ADVANCED_TENSION_LEADS = ['b9', '9', '#9', '11', '#11', 'b13', '13'];
    const PRACTICE_LEAD_LABELS = ['1', '2', '3', 'b3', '4', '5', 'b5', '#5', '6', '7', 'b7'];
    const naturalNotes = ["C", "D", "E", "F", "G", "A", "B"];
    // Punto 8: Incluye doble sostenido (##) y doble bemol (bb)
    const accidentals = ["#", "b", "♮", "##", "bb"];
    const americanToLatin = { "C": "Do", "D": "Re", "E": "Mi", "F": "Fa", "G": "Sol", "A": "La", "B": "Si" };

    const chordStructures = {
        "major": {
            name: "Mayor", cifrado: "", difficulty: "basic",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 4, name: "tercera mayor", label: "3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 }
            ],
            voicing_rules: { "1": ["1", "5", "3"], "3": ["3", "1", "5"], "5": ["5", "3", "1"] },
            continuity_rules: { "1": ["1", "5", "3"], "3": ["3", "1", "5"], "5": ["5", "3", "1"] }
        },
        "minor": {
            name: "Menor", cifrado: "m", difficulty: "basic",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 }
            ],
            voicing_rules: { "1": ["1", "5", "b3"], "b3": ["b3", "1", "5"], "5": ["5", "b3", "1"] },
            continuity_rules: { "1": ["1", "5", "b3"], "b3": ["b3", "1", "5"], "5": ["5", "b3", "1"] }
        },
        "augmented": {
            name: "Aumentado", cifrado: "aug", difficulty: "basic",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 4, name: "tercera mayor", label: "3", degreeOffset: 2 },
                { semitones: 8, name: "quinta aumentada", label: "#5", degreeOffset: 4 }
            ],
            voicing_rules: { "1": ["1", "#5", "3"], "3": ["3", "1", "#5"], "#5": ["#5", "3", "1"] }
        },
        "diminished": {
            name: "Disminuido", cifrado: "º", difficulty: "basic",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 6, name: "quinta disminuida", label: "b5", degreeOffset: 4 }
            ],
            voicing_rules: { "1": ["1", "b5", "b3"], "b3": ["b3", "1", "b5"], "b5": ["b5", "b3", "1"] }
        },
        "maj7": {
            name: "Mayor 7", cifrado: "maj7", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 4, name: "tercera mayor", label: "3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 11, name: "séptima mayor", label: "7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 },
                { semitones: 6, name: "onceava aumentada", label: "#11", degreeOffset: 3 }
            ],
            voicing_rules: {
                "1": ["1", "6", "5", "3"], "3": ["3", "1", "7", "5"], "5": ["5", "3", "1", "7"],
                "6": ["6", "5", "3", "1"], "7": ["7", "5", "3", "1"], "9": ["9", "7", "5", "3"],
                "#11": ["#11", "3", "1", "7"], "13": ["13", "3", "1", "7"]
            }
        },
        "m7": {
            name: "Menor 7", cifrado: "m7", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 10, name: "séptima menor", label: "b7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 },
                { semitones: 5, name: "onceava justa", label: "11", degreeOffset: 3 }
            ],
            voicing_rules: {
                "1": ["1", "b7", "5", "b3"], "b3": ["b3", "1", "b7", "5"], "5": ["5", "b3", "1", "b7"],
                "6": ["6", "5", "b3", "1"], "b7": ["b7", "5", "b3", "1"], "9": ["9", "b7", "5", "b3"],
                "11": ["11", "b7", "5", "b3"], "13": ["13", "b3", "1", "b7"]
            }
        },
        "7": {
            name: "7 (Dominante)", cifrado: "7", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 4, name: "tercera mayor", label: "3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 10, name: "séptima menor", label: "b7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 },
                { semitones: 1, name: "novena menor", label: "b9", degreeOffset: 1 },
                { semitones: 3, name: "novena aumentada", label: "#9", degreeOffset: 1 },
                { semitones: 6, name: "onceava aumentada", label: "#11", degreeOffset: 3 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 8, name: "trecena menor", label: "b13", degreeOffset: 5 },
                { semitones: 5, name: "onceava justa", label: "11", degreeOffset: 3 }
            ],
            voicing_rules: {
                "1": ["1", "b7", "5", "3"], "3": ["3", "1", "b7", "5"], "5": ["5", "3", "1", "b7"],
                "6": ["6", "5", "3", "1"], "b7": ["b7", "5", "3", "1"], "9": ["9", "b7", "5", "3"],
                "b9": ["b9", "b7", "5", "3"], "#9": ["#9", "b7", "5", "3"], "11": ["11", "1", "b7", "5"],
                "#11": ["#11", "3", "9", "b7"], "13": ["13", "3", "1", "b7"], "b13": ["b13", "3", "1", "b7"]
            }
        },
        "m7b5": {
            name: "Menor 7(b5)", cifrado: "m7(b5)", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 6, name: "quinta disminuida", label: "b5", degreeOffset: 4 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 10, name: "séptima menor", label: "b7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 },
                { semitones: 5, name: "onceava justa", label: "11", degreeOffset: 3 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 }
            ],
            voicing_rules: {
                "1": ["1", "b7", "b5", "b3"], "b3": ["b3", "1", "b7", "b5"], "b5": ["b5", "b3", "1", "b7"],
                "6": ["6", "5", "b3", "1"], "b7": ["b7", "b5", "b3", "1"], "9": ["9", "b7", "b5", "b3"],
                "11": ["11", "b7", "b5", "b3"], "13": ["13", "b3", "1", "b7"]
            }
        },
        "dim7": {
            name: "Disminuido 7", cifrado: "º7", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 6, name: "quinta disminuida", label: "b5", degreeOffset: 4 },
                { semitones: 9, name: "séptima disminuida", label: "6", degreeOffset: 5 }
            ],
            voicing_rules: {
                "1": ["1", "6", "b5", "b3"], "b3": ["b3", "1", "6", "b5"], "b5": ["b5", "b3", "1", "6"], "6": ["6", "b5", "b3", "1"]
            }
        }
    };

    Object.assign(chordStructures, {
        "sus2": {
            name: "Suspendido 2 (sus2)", cifrado: "sus2", difficulty: "basic",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 2, name: "segunda mayor", label: "2", degreeOffset: 1 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 }
            ],
            voicing_rules: { "1": ["1", "5", "2"], "2": ["2", "1", "5"], "5": ["5", "2", "1"] }
        },
        "sus4": {
            name: "Suspendido 4 (sus4)", cifrado: "sus4", difficulty: "basic",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 5, name: "cuarta justa", label: "4", degreeOffset: 3 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 }
            ],
            voicing_rules: { "1": ["1", "5", "4"], "4": ["4", "1", "5"], "5": ["5", "4", "1"] }
        },
        "6": {
            name: "Mayor 6", cifrado: "6", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 4, name: "tercera mayor", label: "3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 11, name: "séptima mayor", label: "7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 }
            ],
            voicing_rules: { "1": ["1", "6", "5", "3"], "3": ["3", "1", "6", "5"], "5": ["5", "3", "1", "6"], "6": ["6", "5", "3", "1"], "9": ["9", "6", "5", "3"], "13": ["13", "3", "1", "7"] }
        },
        "m6": {
            name: "Menor 6", cifrado: "m6", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 10, name: "séptima menor", label: "b7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 }
            ],
            voicing_rules: { "1": ["1", "6", "5", "b3"], "b3": ["b3", "1", "6", "5"], "5": ["5", "b3", "1", "6"], "6": ["6", "5", "b3", "1"], "9": ["9", "6", "5", "b3"], "13": ["13", "b3", "1", "b7"] }
        },
        "mMaj7": {
            name: "Menor (Maj7)", cifrado: "m(maj7)", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 3, name: "tercera menor", label: "b3", degreeOffset: 2 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 11, name: "séptima mayor", label: "7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 }
            ],
            voicing_rules: { "1": ["1", "7", "5", "b3"], "b3": ["b3", "1", "7", "5"], "5": ["5", "b3", "1", "7"], "6": ["6", "5", "b3", "1"], "7": ["7", "5", "b3", "1"], "9": ["9", "7", "5", "b3"], "13": ["13", "b3", "1", "7"] }
        },
        "7sus4": {
            name: "Dominante 7sus4", cifrado: "7sus4", difficulty: "intermediate",
            intervals: [
                { semitones: 0, name: "fundamental", label: "1", degreeOffset: 0 },
                { semitones: 5, name: "cuarta justa", label: "11", degreeOffset: 3 },
                { semitones: 7, name: "quinta justa", label: "5", degreeOffset: 4 },
                { semitones: 9, name: "sexta mayor", label: "6", degreeOffset: 5 },
                { semitones: 9, name: "trecena mayor", label: "13", degreeOffset: 5 },
                { semitones: 10, name: "séptima menor", label: "b7", degreeOffset: 6 },
                { semitones: 2, name: "novena mayor", label: "9", degreeOffset: 1 }
            ],
            voicing_rules: { "1": ["1", "b7", "5", "11"], "11": ["11", "1", "b7", "5"], "5": ["5", "11", "1", "b7"], "6": ["6", "5", "11", "1"], "b7": ["b7", "5", "11", "1"], "9": ["9", "b7", "5", "11"], "13": ["13", "11", "1", "b7"] }
        }
    });

    const CLEAN_PC_SPELLINGS = {
        0: ['C'], 1: ['Db', 'C#'], 2: ['D'], 3: ['Eb', 'D#'],
        4: ['E'], 5: ['F'], 6: ['Gb', 'F#'], 7: ['G'],
        8: ['Ab', 'G#'], 9: ['A'], 10: ['Bb', 'A#'], 11: ['B']
    };

    function simplifySingleNoteEnharmonic(noteName, preferFlats = true) {
        if (!noteName) return 'C';
        const options = CLEAN_PC_SPELLINGS[getNoteSemitone(noteName)] || ['C'];
        if (options.length === 1) return options[0];
        const cleanInput = noteName.trim();
        if (options.includes(cleanInput)) return cleanInput;
        return preferFlats ? options[0] : options[1];
    }

    function resolveVoicingSameLetterClashes(notesWithOctaveList, preferFlatsHint = true) {
        if (!Array.isArray(notesWithOctaveList) || !notesWithOctaveList.length) return [];
        const parsed = notesWithOctaveList.map(note => {
            if (!note || !note.includes('/')) return null;
            const midi = getNoteWithOctaveMidi(note);
            return {
                midi,
                pc: ((midi % 12) + 12) % 12,
                octave: Math.floor(midi / 12) - 1,
                rawName: note.split('/')[0]
            };
        });
        const pcs = [...new Set(parsed.filter(Boolean).map(note => note.pc))];
        const optionsByPc = {};
        pcs.forEach(pc => {
            const options = CLEAN_PC_SPELLINGS[pc] || ['C'];
            optionsByPc[pc] = options.length === 2 && !preferFlatsHint ? [options[1], options[0]] : [...options];
        });

        let bestMap = null;
        let bestScore = -Infinity;
        const searchSpelling = (idx, currentMap) => {
            if (idx === pcs.length) {
                const letters = pcs.map(pc => currentMap[pc][0]);
                const collisions = letters.length - new Set(letters).size;
                const preferenceScore = pcs.reduce((score, pc, position) =>
                    score + (currentMap[pc] === optionsByPc[pc][0] ? (position === 0 ? 3 : 2) : 0), 0);
                const score = -collisions * 200 + preferenceScore;
                if (score > bestScore) {
                    bestScore = score;
                    bestMap = { ...currentMap };
                }
                return;
            }
            const pc = pcs[idx];
            optionsByPc[pc].forEach(candidate => {
                currentMap[pc] = candidate;
                searchSpelling(idx + 1, currentMap);
            });
            delete currentMap[pc];
        };
        searchSpelling(0, {});

        return parsed.map(note => {
            if (!note) return null;
            const name = bestMap[note.pc] || simplifySingleNoteEnharmonic(note.rawName, preferFlatsHint);
            return `${name}/${note.octave}`;
        });
    }

    function getNoteSemitone(noteName) {
        const m = noteName && noteName.match(/[A-G]/i);
        if (!m) return 0;
        const nat = m[0].toUpperCase();
        let s = naturalLetterSemitone[nat];
        for (const c of noteName.substring(nat.length)) {
            if (c === '#') s++;
            else if (c === 'b') s--;
        }
        return (s % 12 + 12) % 12;
    }

    function getNoteWithOctaveMidi(noteWithOctave) {
        if (!noteWithOctave || !noteWithOctave.includes('/')) return 60;
        const [noteName, octStr] = noteWithOctave.split('/');
        const oct = parseInt(octStr, 10);
        const m = noteName.match(/^[A-G]/i);
        if (!m) return 60;
        const base = m[0].toUpperCase();
        let acc = 0;
        for (const c of noteName.substring(1)) {
            if (c === '#') acc++;
            else if (c === 'b') acc--;
        }
        return (oct + 1) * 12 + naturalLetterSemitone[base] + acc;
    }

    function shouldShowMeasureAccidental(activeAccidentals, noteWithOctave) {
        const [noteName, octave] = noteWithOctave.split('/');
        const letter = noteName.charAt(0).toUpperCase();
        const accidental = noteName.substring(1);
        const key = `${letter}/${octave}`;
        const hasPreviousAccidental = Object.prototype.hasOwnProperty.call(activeAccidentals, key);
        const shouldShow = hasPreviousAccidental
            ? activeAccidentals[key] !== accidental
            : accidental !== '';
        activeAccidentals[key] = accidental;
        return shouldShow;
    }

    function midiToNoteWithOctave(midiVal, preferFlats = true) {
        const oct = Math.floor(midiVal / 12) - 1;
        const pc = ((midiVal % 12) + 12) % 12;
        const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return `${(preferFlats ? flatNames : sharpNames)[pc]}/${oct}`;
    }

    function calculateNoteName(rootNote, intervalObj) {
        const rootLetter = rootNote.charAt(0).toUpperCase();
        const rootSemitone = getNoteSemitone(rootNote);
        const rootLetterIdx = letterToNumberMap[rootLetter] ?? 0;
        const degreeOffset = Number.isInteger(intervalObj.degreeOffset) ? intervalObj.degreeOffset : 0;
        const targetLetter = numberToLetterMap[(rootLetterIdx + degreeOffset) % 7];
        const targetSemitone = ((rootSemitone + (intervalObj.semitones || 0)) % 12 + 12) % 12;
        let accidental = targetSemitone - naturalLetterSemitone[targetLetter];
        if (accidental > 6) accidental -= 12;
        if (accidental < -6) accidental += 12;
        if (accidental === 0) return targetLetter;
        if (accidental === 1) return `${targetLetter}#`;
        if (accidental === -1) return `${targetLetter}b`;

        const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(rootNote) || rootNote.includes('b');
        const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        return (preferFlats ? flatNames : sharpNames)[targetSemitone];
    }

    function resolveSameLetterCollisionsOnly(notesWithOctaveList) {
        if (!Array.isArray(notesWithOctaveList) || notesWithOctaveList.length < 2) return notesWithOctaveList;
        const items = notesWithOctaveList.map(note => {
            if (!note || !note.includes('/')) return null;
            const [name, octaveText] = note.split('/');
            const midi = getNoteWithOctaveMidi(note);
            return {
                name,
                letter: name.charAt(0).toUpperCase(),
                pitchClass: ((midi % 12) + 12) % 12,
                octave: parseInt(octaveText, 10),
                midi
            };
        });
        const enharmonicAlt = {
            'C#': 'Db', 'Db': 'C#', 'D#': 'Eb', 'Eb': 'D#',
            'F#': 'Gb', 'Gb': 'F#', 'G#': 'Ab', 'Ab': 'G#',
            'A#': 'Bb', 'Bb': 'A#'
        };
        const pitchClassesByLetter = new Map();
        items.forEach(item => {
            if (!item) return;
            if (!pitchClassesByLetter.has(item.letter)) pitchClassesByLetter.set(item.letter, new Set());
            pitchClassesByLetter.get(item.letter).add(item.pitchClass);
        });
        return items.map(item => {
            if (!item) return null;
            const alternate = enharmonicAlt[item.name];
            if (alternate && pitchClassesByLetter.get(item.letter)?.size > 1) {
                return `${alternate}/${Math.floor(item.midi / 12) - 1}`;
            }
            return `${item.name}/${item.octave}`;
        });
    }

    function enforceNoMinorSecondAtTop(notesWithOct, labels, rootNote) {
        if (!Array.isArray(notesWithOct) || notesWithOct.length < 2) return { notesWithOct, labels };
        const correctedNotes = [...notesWithOct];
        const correctedLabels = [...labels];
        const topMidi = getNoteWithOctaveMidi(correctedNotes[0]);
        const secondMidi = getNoteWithOctaveMidi(correctedNotes[1]);
        if (topMidi - secondMidi === 1) {
            const rootPc = getNoteSemitone(rootNote);
            const topPc = ((topMidi % 12) + 12) % 12;
            let replacementName = calculateNoteName(rootNote, { semitones: 9, degreeOffset: 5 });
            let replacementLabel = '6 (Evita 2m)';
            if (topPc !== rootPc) {
                const ninthName = calculateNoteName(rootNote, { semitones: 2, degreeOffset: 1 });
                const ninthPc = getNoteSemitone(ninthName);
                if (((topPc - ninthPc) % 12 + 12) % 12 >= 2) {
                    replacementName = ninthName;
                    replacementLabel = '9 (Evita 2m)';
                } else {
                    const flats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(rootNote) || rootNote.includes('b');
                    correctedNotes[1] = midiToNoteWithOctave(secondMidi - 1, flats);
                    return { notesWithOct: resolveSameLetterCollisionsOnly(correctedNotes), labels: correctedLabels };
                }
            }
            let octave = Math.floor(topMidi / 12);
            let replacementMidi = getNoteWithOctaveMidi(`${replacementName}/${octave}`);
            while (replacementMidi >= topMidi) {
                octave--;
                replacementMidi -= 12;
            }
            while (replacementMidi < topMidi - 12) {
                octave++;
                replacementMidi += 12;
            }
            correctedNotes[1] = `${replacementName}/${octave}`;
            correctedLabels[1] = replacementLabel;
        }
        return { notesWithOct: resolveSameLetterCollisionsOnly(correctedNotes), labels: correctedLabels };
    }

    function displayNote(noteStr) {
        if (!noteStr) return '';
        const clean = noteStr.split('/')[0];
        const base = clean.charAt(0).toUpperCase();
        const acc = clean.substring(1);
        if (state.notationSystem === 'latin') {
            return (americanToLatin[base] || base) + acc;
        }
        return base + acc;
    }

    function formatScientificPitch(noteWithOct) {
        if (!noteWithOct) return '';
        const [nm, oct] = noteWithOct.split('/');
        return `${displayNote(nm)}${oct !== undefined ? oct : ''}`;
    }

    function arrangeInnerVoicesInClosePosition(topNoteWithOctave, innerVoiceSpecs) {
        return placeVoicesInStrictOrderOfAppearance(topNoteWithOctave, innerVoiceSpecs, true);
    }

    function getChordScaleIntervals(chordTypeKey, explicitScaleId = null) {
        const list = CHORD_SCALE_CONTEXT_CATALOG[chordTypeKey] || CHORD_SCALE_CONTEXT_CATALOG['maj7'];
        const scaleObj = (explicitScaleId && list.find(s => s.id === explicitScaleId)) || list[0];
        if (scaleObj && Array.isArray(scaleObj.semitones)) {
            return scaleObj.semitones.map((semi, idx) => ({
                label: scaleObj.labels[idx] || '1',
                semitones: semi,
                degreeOffset: scaleObj.degs[idx] !== undefined ? scaleObj.degs[idx] : idx
            }));
        }
        return [
            { label: '1', semitones: 0, degreeOffset: 0 }, { label: '9', semitones: 2, degreeOffset: 1 },
            { label: '3', semitones: 4, degreeOffset: 2 }, { label: '#11', semitones: 6, degreeOffset: 3 },
            { label: '5', semitones: 7, degreeOffset: 4 }, { label: '6', semitones: 9, degreeOffset: 5 },
            { label: '7', semitones: 11, degreeOffset: 6 }
        ];
    }

    function getChordScaleDefinition(chordTypeKey, scaleId = null) {
        const scales = CHORD_SCALE_CONTEXT_CATALOG[chordTypeKey] || CHORD_SCALE_CONTEXT_CATALOG.maj7;
        return (scales && scales.find(scale => scale.id === scaleId)) || scales?.[0] || { id: "ionian", name: "Jónica", availTensions: ["9", "13"], avoid: ["11"] };
    }

    function isChordToneOrAvailableTension(noteName, chordRoot, chordTypeKey, scaleId) {
        const relation = getCoherentChordRelationLabel(noteName, chordRoot, chordTypeKey);
        const scaleDefinition = getChordScaleDefinition(chordTypeKey, scaleId);
        return relation.isChordTone || Boolean(scaleDefinition?.availTensions?.includes(relation.label));
    }

    function getContextualEnharmonicSpelling(noteObj) {
        if (!noteObj || noteObj.isRest) return null;
        const target = noteObj.isMainMelodicNote ? noteObj : (noteObj.analysisTargetNoteObj || noteObj);
        const root = target.barChordRoot || noteObj.barChordRoot;
        const type = target.barChordTypeKey || noteObj.barChordTypeKey;
        const scale = getChordScaleIntervals(type, target.barScaleId || noteObj.barScaleId);
        const pitchClass = getNoteSemitone(noteObj.note.split('/')[0]);
        const currentName = noteObj.note.split('/')[0];
        const contextualName = scale
            .map(interval => calculateNoteName(root, interval))
            .find(name => getNoteSemitone(name) === pitchClass && name !== currentName);
        if (contextualName) return contextualName;
        const commonEnharmonicAlternates = {
            'C#': 'Db', 'Db': 'C#', 'D#': 'Eb', 'Eb': 'D#',
            'F#': 'Gb', 'Gb': 'F#', 'G#': 'Ab', 'Ab': 'G#',
            'A#': 'Bb', 'Bb': 'A#'
        };
        return commonEnharmonicAlternates[currentName] || null;
    }

    function getImplicitBassWithOctave(rootNote, lowestUpperMidi = 60) {
        const cleanRoot = calculateNoteName(rootNote, { semitones: 0, degreeOffset: 0 });
        let bassOct = 2;
        let bassMidi = getNoteWithOctaveMidi(cleanRoot + '/' + bassOct);
        while (bassMidi < 40) { bassOct++; bassMidi += 12; }
        while (bassMidi >= lowestUpperMidi - 3 && bassOct > 1) { bassOct--; bassMidi -= 12; }
        return cleanRoot + '/' + bassOct;
    }

    // Coloca una lista de notas en estricto orden de aparición de la voz (Voz 1 -> Voz 2 -> Voz 3 -> Voz 4)
    function placeVoicesInStrictOrderOfAppearance(topNoteWithOctave, innerVoiceSpecs, enforceCloseSortedOrder = false) {
        const notesWithOct = [topNoteWithOctave];
        const labels = [];
        const topMidi = getNoteWithOctaveMidi(topNoteWithOctave);
        if (enforceCloseSortedOrder) {
            // Posición cerrada estricta: ubica cada voz a la distancia más cercana por debajo de la 1ª voz (dentro de 1 octava) y las ordena de agudo a grave
            const candidates = innerVoiceSpecs.map(spec => {
                const nm = spec.noteName;
                let oct = Math.floor(topMidi / 12);
                let candMidi = getNoteWithOctaveMidi(nm + '/' + oct);
                while (candMidi >= topMidi) { oct--; candMidi -= 12; }
                while (candMidi < topMidi - 12) { oct++; candMidi += 12; }
                return { noteWithOct: `${nm}/${oct}`, midi: candMidi, label: spec.label };
            }).sort((a, b) => b.midi - a.midi);
            let prevM = topMidi;
            candidates.forEach(c => {
                let m = c.midi;
                let [nm, oc] = c.noteWithOct.split('/');
                let oNum = parseInt(oc, 10);
                while (m >= prevM) { oNum--; m -= 12; }
                notesWithOct.push(`${nm}/${oNum}`);
                labels.push(c.label);
                prevM = m;
            });
            return { notesWithOct, labels };
        }
        let prevMidi = topMidi;
        innerVoiceSpecs.forEach(spec => {
            const nm = spec.noteName;
            let oct = Math.floor(prevMidi / 12) - 1;
            let candMidi = getNoteWithOctaveMidi(nm + '/' + oct);
            while (candMidi >= prevMidi) { oct--; candMidi -= 12; }
            while (candMidi < prevMidi - 12) { oct++; candMidi += 12; }
            notesWithOct.push(nm + '/' + oct);
            labels.push(spec.label);
            prevMidi = candMidi;
        });
        return { notesWithOct, labels };
    }

    function arrangeInnerVoicesInClosePosition(topNoteWithOctave, innerVoiceSpecs) {
        return placeVoicesInStrictOrderOfAppearance(topNoteWithOctave, innerVoiceSpecs, true);
    }

    // Construye las Variantes 1, 2 y 3 del 4-Way Close en estricto orden de aparición de la voz (2, 3, 4)
    // Ejemplo exacto para C# sobre A7: Variante 1 = C#-B-G-E | Variante 2 = C#-G-F#-E | Variante 3 = C#-G-E-A
    function build4WayCloseVariantInVoiceOrder(rootNote, chordTypeKey, leadLabel, topNoteWithOctave, variantKey) {
        const chordData = chordStructures[chordTypeKey] || chordStructures['maj7'];
        const thirdLbl = chordData.intervals.some(i => i.label === 'b3') ? 'b3' : '3';
        const sevLbl = chordData.intervals.some(i => i.label === '7') ? '7' : (chordData.intervals.some(i => i.label === 'b7') ? 'b7' : '6');
        const fifthLbl = chordData.intervals.some(i => i.label === 'b5') ? 'b5' : '5';

        const getIntNote = (lbl, fallbackSemi, fallbackDeg) => {
            const found = chordData.intervals.find(i => i.label === lbl);
            return calculateNoteName(rootNote, found || { semitones: fallbackSemi, degreeOffset: fallbackDeg });
        };
        const rootName = calculateNoteName(rootNote, { semitones: 0, degreeOffset: 0 });
        const thirdName = getIntNote(thirdLbl, thirdLbl === 'b3' ? 3 : 4, 2);
        const fifthName = getIntNote(fifthLbl, fifthLbl === 'b5' ? 6 : 7, 4);
        const sevName = getIntNote(sevLbl, sevLbl === '7' ? 11 : (sevLbl === 'b7' ? 10 : 9), sevLbl === '6' ? 5 : 6);
        const ninthName = calculateNoteName(rootNote, { semitones: 2, degreeOffset: 1 });
        const secondTensionLbl = (chordTypeKey === 'm7' || chordTypeKey === 'minor' || chordTypeKey === 'm7b5') ? '11' : '13';
        const secondTensionInt = secondTensionLbl === '11' ? { semitones: 5, degreeOffset: 3 } : { semitones: 9, degreeOffset: 5 };
        const secondTensionName = calculateNoteName(rootNote, secondTensionInt);

        const isLeadThird = leadLabel === '3' || leadLabel === 'b3';
        const isLeadSeventh = leadLabel === '7' || leadLabel === 'b7' || leadLabel === '6';
        const missingGuideName = isLeadThird ? sevName : (isLeadSeventh ? thirdName : sevName);
        const missingGuideLbl = isLeadThird ? sevLbl : (isLeadSeventh ? thirdLbl : sevLbl);
        const secondGuideName = isLeadThird ? thirdName : (isLeadSeventh ? sevName : thirdName);
        const secondGuideLbl = isLeadThird ? thirdLbl : (isLeadSeventh ? sevLbl : thirdLbl);

        const vNum = variantKey.endsWith('1') ? 1 : (variantKey.endsWith('2') ? 2 : 3);
        let innerSpecs = [];

        if (vNum === 1) {
            // Variante 1: Nota melódica + 2 notas guías + 1 nota no guía o tensión disponible en orden de aparición
            // Si la melodía ya es guía (ej. C# en A7), Voz 2 = 9na (B), Voz 3 = Guía faltante (G), Voz 4 = 5ta (E) -> C# - B - G - E
            if (isLeadThird || isLeadSeventh) {
                innerSpecs = [
                    { noteName: ninthName, label: '9 (Var.1)' },
                    { noteName: missingGuideName, label: `${missingGuideLbl} (Guía)` },
                    { noteName: fifthName, label: `${fifthLbl} (No Guía)` }
                ];
            } else {
                innerSpecs = [
                    { noteName: sevName, label: `${sevLbl} (Guía)` },
                    { noteName: thirdName, label: `${thirdLbl} (Guía)` },
                    { noteName: ninthName, label: '9 (Var.1)' }
                ];
            }
        } else if (vNum === 2) {
            // Variante 2: Nota melódica + 1 nota guía + 2 notas no guías o tensiones disponibles en orden de aparición
            // Ej. C# en A7: Voz 2 = G (b7, guía), Voz 3 = F# (13, tensión), Voz 4 = E (5, no guía) -> C# - G - F# - E
            innerSpecs = [
                { noteName: missingGuideName, label: `${missingGuideLbl} (Guía)` },
                { noteName: secondTensionName, label: `${secondTensionLbl} (Var.2)` },
                { noteName: fifthName, label: `${fifthLbl} (No Guía)` }
            ];
        } else {
            // Variante 3: Nota guía como melodía + nota guía faltante + 2 notas no guías o tensiones en orden de aparición
            // Ej. C# en A7: Voz 1 = C# (3), Voz 2 = G (b7, guía faltante), Voz 3 = E (5, no guía), Voz 4 = A (1, no guía) -> C# - G - E - A
            innerSpecs = [
                { noteName: missingGuideName, label: `${missingGuideLbl} (Guía)` },
                { noteName: fifthName, label: `${fifthLbl} (No Guía)` },
                { noteName: rootName, label: '1 (No Guía)' }
            ];
        }

        const placed = placeVoicesInStrictOrderOfAppearance(topNoteWithOctave, innerSpecs);
        return {
            labels: [`${leadLabel} (Voz 1)`, ...placed.labels],
            notesWithOct: placed.notesWithOct
        };
    }

    function buildCloseVoicingForChordAndLead(rootNote, chordTypeKey, leadLabel, targetTopNoteWithOctave = null) {
        const chordData = chordStructures[chordTypeKey] || chordStructures['maj7'];
        const rules = (state.continuityMode && chordData.continuity_rules) ? chordData.continuity_rules : chordData.voicing_rules;
        const safeLead = rules[leadLabel] ? leadLabel : Object.keys(rules)[0];
        const isTriad = chordData.difficulty === 'basic' || state.difficulty === 'basic';
        const count = isTriad ? 3 : (rules[safeLead].length >= 4 ? 4 : rules[safeLead].length);
        const labels = [...rules[safeLead].slice(0, count)];

        let topNoteWithOctave = targetTopNoteWithOctave;
        if (!topNoteWithOctave) {
            const intObj = chordData.intervals.find(i => i.label === safeLead) || chordData.intervals[0];
            topNoteWithOctave = calculateNoteName(rootNote, intObj) + '/5';
        }

        const topMidi = getNoteWithOctaveMidi(topNoteWithOctave);
        const notesWithOct = [topNoteWithOctave];
        let lastMidi = topMidi;

        for (let i = 1; i < labels.length; i++) {
            const intObj = chordData.intervals.find(x => x.label === labels[i]) || chordData.intervals[0];
            const nm = calculateNoteName(rootNote, intObj);
            let oct = Math.floor(lastMidi / 12) - 1;
            let cand = getNoteWithOctaveMidi(nm + '/' + oct);
            while (cand < lastMidi - 12) { oct++; cand += 12; }
            while (cand >= lastMidi) { oct--; cand -= 12; }
            notesWithOct.push(nm + '/' + oct);
            lastMidi = cand;
        }
        const checked = enforceNoMinorSecondAtTop(notesWithOct, labels, rootNote);
        return { labels: checked.labels, notesWithOct: checked.notesWithOct };
    }

    // Construye Ambi Chords (Modelos A, B y C) coherentes con la escala del momento armónico (tensiones.pdf)
    function buildAmbiChordCoherentWithScale(rootNote, chordTypeKey, topNoteWithOctave, ambiModel = 'ambi_a', explicitScaleId = null) {
        const scale = getChordScaleIntervals(chordTypeKey, explicitScaleId);
        const topName = topNoteWithOctave.split('/')[0];
        const topMidi = getNoteWithOctaveMidi(topNoteWithOctave);
        const topPc = getNoteSemitone(topName);
        let sIdx = scale.findIndex(s => getNoteSemitone(calculateNoteName(rootNote, s)) === topPc);
        if (sIdx === -1) {
            sIdx = 0;
            let minDiff = 99;
            scale.forEach((s, idx) => {
                const pc = getNoteSemitone(calculateNoteName(rootNote, s));
                const d = Math.abs(pc - topPc);
                if (d < minDiff) { minDiff = d; sIdx = idx; }
            });
        }
        const steps = ambiModel === 'ambi_a' ? [0, -3, -4] : (ambiModel === 'ambi_b' ? [0, -3, -6] : [0, -1, -4]);
        const notesWithOct = [topNoteWithOctave];
        const leadScaleLbl = scale[sIdx]?.label || '1';
        const labels = [`${leadScaleLbl} (Voz 1)`];
        let prevMidi = topMidi;

        for (let k = 1; k < 3; k++) {
            const scInt = scale[((sIdx + steps[k]) % scale.length + scale.length) % scale.length];
            const nm = calculateNoteName(rootNote, scInt);
            let oct = Math.floor(prevMidi / 12) - 1;
            let m = getNoteWithOctaveMidi(`${nm}/${oct}`);
            while (m >= prevMidi) { oct--; m -= 12; }
            while (m < prevMidi - 12) { oct++; m += 12; }
            notesWithOct.push(`${nm}/${oct}`);
            const intervalType = Math.abs(steps[k] - steps[k - 1]) === 3 ? '4ta Escalar' : '2da Escalar';
            labels.push(`${scInt.label} (${intervalType})`);
            prevMidi = m;
        }
        const [leadNm, leadOctStr] = topNoteWithOctave.split('/');
        notesWithOct.push(`${leadNm}/${parseInt(leadOctStr, 10) - 1}`);
        labels.push(`${leadScaleLbl} (8vb)`);
        return { labels, notesWithOct };
    }

    // Construye todas las disposiciones completas del acorde (Drops, Spreads 4V y 5V M1-M3, Double Lead, Ambi Chords, Variantes 1-3 en orden de voz)
    function applyDispositionToCloseVoicingRaw(rootNote, chordTypeKey, leadLabel, closeLabels, closeNotesWithOct, dispositionMode) {
        if (!dispositionMode || dispositionMode === 'close') {
            return { labels: [...closeLabels], notesWithOct: [...closeNotesWithOct] };
        }
        const dropOct = (nStr) => {
            const [nm, oc] = nStr.split('/');
            return `${nm}/${parseInt(oc, 10) - 1}`;
        };
        const placeBelow = (noteName, refMidi, minGap = 2) => {
            let oct = Math.floor(refMidi / 12) - 1;
            let m = getNoteWithOctaveMidi(`${noteName}/${oct}`);
            while (m > refMidi - minGap) { oct--; m -= 12; }
            while (m < refMidi - 14) { oct++; m += 12; }
            return `${noteName}/${oct}`;
        };

        if (['ambi_a', 'ambi_b', 'ambi_c'].includes(dispositionMode)) {
            return buildAmbiChordCoherentWithScale(rootNote, chordTypeKey, closeNotesWithOct[0], dispositionMode);
        }
        if (['close_var1', 'close_var2', 'close_var3'].includes(dispositionMode) && closeNotesWithOct.length >= 4) {
            return build4WayCloseVariantInVoiceOrder(rootNote, chordTypeKey, leadLabel, closeNotesWithOct[0], dispositionMode);
        }
        if ((dispositionMode === 'double_lead' || dispositionMode === 'shearing') && closeNotesWithOct.length >= 4) {
            return {
                labels: [...closeLabels.slice(0, 4), `${closeLabels[0]} (5ª Voz 8vb)`],
                notesWithOct: [...closeNotesWithOct.slice(0, 4), dropOct(closeNotesWithOct[0])]
            };
        }
        if (dispositionMode === 'drop2' && closeNotesWithOct.length >= 4) {
            return {
                labels: [closeLabels[0], closeLabels[2], closeLabels[3], `${closeLabels[1]} [Drop 2]`],
                notesWithOct: [closeNotesWithOct[0], closeNotesWithOct[2], closeNotesWithOct[3], dropOct(closeNotesWithOct[1])]
            };
        }
        if (dispositionMode === 'drop3' && closeNotesWithOct.length >= 4) {
            return {
                labels: [closeLabels[0], closeLabels[1], closeLabels[3], `${closeLabels[2]} [Drop 3]`],
                notesWithOct: [closeNotesWithOct[0], closeNotesWithOct[1], closeNotesWithOct[3], dropOct(closeNotesWithOct[2])]
            };
        }
        if (dispositionMode === 'drop24' && closeNotesWithOct.length >= 4) {
            return {
                labels: [closeLabels[0], closeLabels[2], `${closeLabels[1]} [Drop 2]`, `${closeLabels[3]} [Drop 4]`],
                notesWithOct: [closeNotesWithOct[0], closeNotesWithOct[2], dropOct(closeNotesWithOct[1]), dropOct(closeNotesWithOct[3])]
            };
        }
        // Spread Voicings (7.pdf Pág. 2)
        const chordData = chordStructures[chordTypeKey] || chordStructures['maj7'];
        const thirdLbl = chordData.intervals.some(i => i.label === 'b3') ? 'b3' : '3';
        const sevLbl = chordData.intervals.some(i => i.label === '7') ? '7' : (chordData.intervals.some(i => i.label === 'b7') ? 'b7' : '6');
        const fifthLbl = chordData.intervals.some(i => i.label === 'b5') ? 'b5' : '5';
        const ninthName = calculateNoteName(rootNote, { semitones: 2, degreeOffset: 1 });

        if (dispositionMode === 'spread4') {
            let v2Lbl = sevLbl, v3Lbl = thirdLbl;
            if (leadLabel === thirdLbl) { v2Lbl = sevLbl; v3Lbl = fifthLbl; }
            else if (leadLabel === sevLbl || leadLabel === '6') { v2Lbl = thirdLbl; v3Lbl = fifthLbl; }
            const v2Int = chordData.intervals.find(i => i.label === v2Lbl) || chordData.intervals[1];
            const v3Int = chordData.intervals.find(i => i.label === v3Lbl) || chordData.intervals[2];
            const n1 = closeNotesWithOct[0];
            const n2 = placeBelow(calculateNoteName(rootNote, v2Int), getNoteWithOctaveMidi(n1), 3);
            const n3 = placeBelow(calculateNoteName(rootNote, v3Int), getNoteWithOctaveMidi(n2), 3);
            const n4 = getImplicitBassWithOctave(rootNote, getNoteWithOctaveMidi(n3));
            return { labels: [closeLabels[0], `${v2Lbl} (Guía)`, `${v3Lbl} (Spread)`, '1 (Raíz Bajo)'], notesWithOct: [n1, n2, n3, n4] };
        }
        if (dispositionMode === 'spread5_m1') {
            const v2Lbl = leadLabel === '9' ? sevLbl : '9';
            const v3Lbl = v2Lbl === sevLbl ? thirdLbl : sevLbl;
            const v4Lbl = (v3Lbl === thirdLbl && leadLabel !== fifthLbl) ? fifthLbl : thirdLbl;
            const v2Name = v2Lbl === '9' ? ninthName : calculateNoteName(rootNote, chordData.intervals.find(i => i.label === v2Lbl) || chordData.intervals[0]);
            const v3Name = calculateNoteName(rootNote, chordData.intervals.find(i => i.label === v3Lbl) || chordData.intervals[1]);
            const v4Name = calculateNoteName(rootNote, chordData.intervals.find(i => i.label === v4Lbl) || chordData.intervals[2]);
            const n1 = closeNotesWithOct[0];
            const n2 = placeBelow(v2Name, getNoteWithOctaveMidi(n1), 2);
            const n3 = placeBelow(v3Name, getNoteWithOctaveMidi(n2), 3);
            const n4 = placeBelow(v4Name, getNoteWithOctaveMidi(n3), 3);
            const n5 = getImplicitBassWithOctave(rootNote, getNoteWithOctaveMidi(n4));
            return { labels: [closeLabels[0], `${v2Lbl} (M1)`, `${v3Lbl} (Guía)`, `${v4Lbl} (Spread)`, '1 (Raíz Bajo)'], notesWithOct: [n1, n2, n3, n4, n5] };
        }
        if (dispositionMode === 'drop2_spread5' || dispositionMode === 'quasi_spread5') {
            const innerSpecs = [];
            for (let i = 1; i < closeLabels.length; i++) {
                const orig = closeLabels[i];
                if (orig === '1') innerSpecs.push({ noteName: ninthName, label: '9 (x Raíz)' });
                else innerSpecs.push({ noteName: closeNotesWithOct[i].split('/')[0], label: orig });
            }
            const closeWith9 = arrangeInnerVoicesInClosePosition(closeNotesWithOct[0], innerSpecs);
            const cNotes = closeWith9.notesWithOct;
            const cLabels = [closeLabels[0], ...closeWith9.labels];
            if (dispositionMode === 'drop2_spread5') {
                const d2N = [cNotes[0], cNotes[2], cNotes[3], dropOct(cNotes[1])];
                const d2L = [cLabels[0], cLabels[2], cLabels[3], `${cLabels[1]} [Drop 2]`];
                const bass = getImplicitBassWithOctave(rootNote, getNoteWithOctaveMidi(d2N[3]));
                return { labels: [...d2L, '1 (Tónica Base)'], notesWithOct: [...d2N, bass] };
            }
            const bass = getImplicitBassWithOctave(rootNote, getNoteWithOctaveMidi(cNotes[3]));
            return { labels: [...cLabels, '1 (Tónica Base)'], notesWithOct: [...cNotes, bass] };
        }
        return { labels: [...closeLabels], notesWithOct: [...closeNotesWithOct] };
    }

    function applyDispositionToCloseVoicing(rootNote, chordTypeKey, leadLabel, closeLabels, closeNotesWithOct, dispositionMode) {
        const voicing = applyDispositionToCloseVoicingRaw(
            rootNote, chordTypeKey, leadLabel, closeLabels, closeNotesWithOct, dispositionMode
        );
        const checked = enforceNoMinorSecondAtTop(voicing.notesWithOct, voicing.labels, rootNote);
        return { ...voicing, labels: checked.labels, notesWithOct: checked.notesWithOct };
    }

    let pianoSampler = null, pianoSamplerLoaded = false, warmPolySynth = null;
    function ensureAudioInitialized() {
        if (state.audioContextStarted || typeof Tone === 'undefined') return;
        try {
            Tone.start().catch(() => {});
            const comp = new Tone.Compressor({ threshold: -18, ratio: 3 }).toDestination();
            const rev = new Tone.Reverb({ decay: 1.4, wet: 0.2 }).connect(comp);
            warmPolySynth = new Tone.PolySynth(Tone.Synth, {
                maxPolyphony: 64,
                oscillator: { type: "triangle" },
                envelope: { attack: 0.008, decay: 1.1, sustain: 0.15, release: 1.2 }
            }).connect(rev);
            warmPolySynth.volume.value = -8;

            pianoSampler = new Tone.Sampler({
                urls: { A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3", C6: "C6.mp3" },
                release: 1.2,
                baseUrl: "https://tonejs.github.io/audio/salamander/",
                onload: () => { pianoSamplerLoaded = true; }
            }).connect(rev);
            pianoSampler.volume.value = -3;
            state.audioContextStarted = true;
        } catch (e) {}
    }

    function getActiveInstrument() {
        if (state.instrument === 'piano' && pianoSamplerLoaded && pianoSampler) return pianoSampler;
        return warmPolySynth || pianoSampler;
    }

    function triggerUpperVoiceNotes(notesWithOctaveList, duration = "4n", time = undefined) {
        ensureAudioInitialized();
        if (typeof Tone === 'undefined' || !Array.isArray(notesWithOctaveList)) return;
        const valid = notesWithOctaveList.filter(Boolean);
        if (!valid.length) return;
        const now = time !== undefined ? time : Tone.now();
        const inst = getActiveInstrument();
        if (!inst) return;
        valid.forEach((n, idx) => {
            try {
                inst.triggerAttackRelease(Tone.Frequency(getNoteWithOctaveMidi(n), "midi").toNote(), duration, now + idx * 0.003, idx === 0 ? 0.9 : 0.75);
            } catch (e) {}
        });
    }

    function triggerDeepBassNote(bassNoteWithOctave, duration = "2n", time = undefined) {
        ensureAudioInitialized();
        if (!bassNoteWithOctave || typeof Tone === 'undefined') return;
        const now = time !== undefined ? time : Tone.now();
        const midi = getNoteWithOctaveMidi(bassNoteWithOctave);
        const lowMidi = midi > 52 ? midi - 12 : midi;
        const inst = getActiveInstrument();
        if (!inst) return;
        try {
            inst.triggerAttackRelease(Tone.Frequency(lowMidi, "midi").toNote(), duration, now, 0.95);
        } catch (e) {}
    }

    function playNotesList(notesWithOctaveList, explicitBassNote = null) {
        ensureAudioInitialized();
        const valid = (notesWithOctaveList || []).filter(Boolean);
        if (!valid.length) return;
        updatePianoVisuals(valid);
        const now = Tone.now();
        const dir = el('arpeggioDirectionSelect')?.value || 'block';
        const lowestMidi = Math.min(...valid.map(n => getNoteWithOctaveMidi(n)));
        const bassToPlay = explicitBassNote || getImplicitBassWithOctave(state.chordRoot, lowestMidi);

        if (dir === 'block') {
            triggerUpperVoiceNotes(valid, "2n", now);
            if (bassToPlay) triggerDeepBassNote(bassToPlay, "2n", now);
        } else {
            const sorted = [...valid].sort((a, b) => dir === 'descending'
                ? getNoteWithOctaveMidi(b) - getNoteWithOctaveMidi(a)
                : getNoteWithOctaveMidi(a) - getNoteWithOctaveMidi(b));
            let t = now;
            sorted.forEach(n => { triggerUpperVoiceNotes([n], "8n", t); t += 0.16; });
            triggerUpperVoiceNotes(valid, "2n", t + 0.1);
            if (bassToPlay) triggerDeepBassNote(bassToPlay, "2n", t + 0.1);
        }
    }

    // Ejemplos de Estudio Melódico con soporte de 2 acordes por compás (Punto 2: G7 en tiempos 1-2 y Cmaj7 en tiempos 3-4)
    const MELODIC_ANALYSIS_EXAMPLES = {
        "f3_4_1": {
            id: "f3_4_1", bars: 4, title: "Ej. 1 (4C): Cmaj7 | A7 | Dm7 | G7 - Cmaj7",
            measures: [
                {
                    bar: 1, chordRoot: "C", chordTypeKey: "maj7", chordSymbol: "Cmaj7",
                    harmonicRhythm: [{ root: "C", type: "maj7", startBeat: 0, durationBeats: 4, scaleId: "ionian" }],
                    notes: [
                        { note: "E/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "F/5", dur: "16", isWeakBeat: true, pOrS: "S", groupType: "res_ret_start", defaultOpt: "del_cd" },
                        { note: "D/5", dur: "16", isWeakBeat: true, pOrS: "S", groupType: "res_ret_end", defaultOpt: "del_cd" },
                        { note: "E/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "G/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "F#/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "chromatic_below" },
                        { note: "G/5", dur: "q", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 2, chordRoot: "A", chordTypeKey: "7", chordSymbol: "A7",
                    harmonicRhythm: [{ root: "A", type: "7", startBeat: 0, durationBeats: 4, scaleId: "mixolydian_b9b13" }],
                    notes: [
                        { note: "C#/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "Eb/5", dur: "16", isWeakBeat: true, pOrS: "S", groupType: "dbl_chrom_start", defaultOpt: "double_chrom" },
                        { note: "D/5", dur: "16", isWeakBeat: true, pOrS: "S", groupType: "dbl_chrom_end", defaultOpt: "double_chrom" },
                        { note: "C#/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "G/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "dominant" }
                    ]
                },
                {
                    bar: 3, chordRoot: "D", chordTypeKey: "m7", chordSymbol: "Dm7",
                    harmonicRhythm: [{ root: "D", type: "m7", startBeat: 0, durationBeats: 4, scaleId: "dorian" }],
                    notes: [
                        { note: "F/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "A/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "G/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "diatonic" },
                        { note: "F/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "C#/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "chromatic_below" }
                    ]
                },
                {
                    bar: 4, chordRoot: "G", chordTypeKey: "7", chordSymbol: "G7 - Cmaj7",
                    harmonicRhythm: [
                        { root: "G", type: "7", startBeat: 0, durationBeats: 2, scaleId: "mixolydian" },
                        { root: "C", type: "maj7", startBeat: 2, durationBeats: 2, scaleId: "ionian" }
                    ],
                    notes: [
                        { note: "B/4", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "Eb/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "chromatic_above" },
                        { note: "E/5", dur: "h", isWeakBeat: false, pOrS: "P" }
                    ]
                }
            ]
        },
        "f3_8_1": {
            id: "f3_8_1", bars: 8, title: "Ej. 2 (8C): Cmaj7 | Bm7b5 - E7 | Am7 - D7 | Gm7 - C7 | Fmaj7 | Fm7 - Bb7 | Em7 - A7 | Dm7 - G7",
            measures: [
                {
                    bar: 1, chordRoot: "C", chordTypeKey: "maj7", chordSymbol: "Cmaj7",
                    harmonicRhythm: [{ root: "C", type: "maj7", startBeat: 0, durationBeats: 4, scaleId: "ionian" }],
                    notes: [
                        { note: "G/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "diatonic" },
                        { note: "C/5", dur: "h", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 2, chordRoot: "B", chordTypeKey: "m7b5", chordSymbol: "Bm7(b5) - E7",
                    harmonicRhythm: [
                        { root: "B", type: "m7b5", startBeat: 0, durationBeats: 2, scaleId: "locrian_nat6" },
                        { root: "E", type: "7", startBeat: 2, durationBeats: 2, scaleId: "mixolydian_b9b13" }
                    ],
                    notes: [
                        { note: "D/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "F/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "parallel" },
                        { note: "C/5", dur: "q", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 3, chordRoot: "A", chordTypeKey: "m7", chordSymbol: "Am7 - D7",
                    harmonicRhythm: [
                        { root: "A", type: "m7", startBeat: 0, durationBeats: 2, scaleId: "dorian" },
                        { root: "D", type: "7", startBeat: 2, durationBeats: 2, scaleId: "mixolydian_s4" }
                    ],
                    notes: [
                        { note: "C/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "F#/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "G#/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "chromatic_below" },
                        { note: "A/5", dur: "q", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 4, chordRoot: "G", chordTypeKey: "m7", chordSymbol: "Gm7 - C7",
                    harmonicRhythm: [
                        { root: "G", type: "m7", startBeat: 0, durationBeats: 2, scaleId: "dorian" },
                        { root: "C", type: "7", startBeat: 2, durationBeats: 2, scaleId: "mixolydian" }
                    ],
                    notes: [
                        { note: "Bb/4", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "G/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "dominant" },
                        { note: "A/5", dur: "q", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 5, chordRoot: "F", chordTypeKey: "maj7", chordSymbol: "Fmaj7",
                    harmonicRhythm: [{ root: "F", type: "maj7", startBeat: 0, durationBeats: 4, scaleId: "lydian" }],
                    notes: [
                        { note: "A/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "G/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "diatonic" },
                        { note: "F/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "C/5", dur: "h", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 6, chordRoot: "F", chordTypeKey: "m7", chordSymbol: "Fm7 - Bb7",
                    harmonicRhythm: [
                        { root: "F", type: "m7", startBeat: 0, durationBeats: 2, scaleId: "dorian" },
                        { root: "Bb", type: "7", startBeat: 2, durationBeats: 2, scaleId: "mixolydian_s4" }
                    ],
                    notes: [
                        { note: "Ab/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "F/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "F/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "tonic_bVII7_I" },
                        { note: "G/5", dur: "q", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 7, chordRoot: "E", chordTypeKey: "m7", chordSymbol: "Em7 - A7",
                    harmonicRhythm: [
                        { root: "E", type: "m7", startBeat: 0, durationBeats: 2, scaleId: "phrygian" },
                        { root: "A", type: "7", startBeat: 2, durationBeats: 2, scaleId: "mixolydian_b9b13" }
                    ],
                    notes: [
                        { note: "G/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "B/4", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "C#/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "E/5", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "dominant" },
                        { note: "F/5", dur: "q", isWeakBeat: false, pOrS: "P" }
                    ]
                },
                {
                    bar: 8, chordRoot: "D", chordTypeKey: "m7", chordSymbol: "Dm7 - G7",
                    harmonicRhythm: [
                        { root: "D", type: "m7", startBeat: 0, durationBeats: 2, scaleId: "dorian" },
                        { root: "G", type: "7", startBeat: 2, durationBeats: 2, scaleId: "mixolydian" }
                    ],
                    notes: [
                        { note: "F/5", dur: "q", isWeakBeat: false, pOrS: "P" },
                        { note: "D/5", dur: "8", isWeakBeat: false, pOrS: "P" },
                        { note: "B/4", dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "dominant" },
                        { note: "C/5", dur: "h", isWeakBeat: false, pOrS: "P" }
                    ]
                }
            ]
        }
    };

    const JAZZ_STANDARDS_LIBRARY = [
        { id: "std_autumn_leaves", category: "Swing", title: "Autumn Leaves (Sec. A - Gm)", bpm: 120, prog: [["C", "m7", 1], ["F", "7", 1], ["Bb", "maj7", 1], ["Eb", "maj7", 1], ["A", "m7b5", 1], ["D", "7", 1], ["G", "m7", 1], ["G", "m6", 1]] },
        { id: "std_all_the_things", category: "Swing", title: "All The Things You Are (Sec. A)", bpm: 125, prog: [["F", "m7", 1], ["Bb", "m7", 1], ["Eb", "7", 1], ["Ab", "maj7", 1], ["Db", "maj7", 1], ["D", "m7", 2, "G", "7"], ["C", "maj7", 1], ["C", "6", 1]] },
        { id: "std_take_a_train", category: "Swing", title: "Take The 'A' Train (Sec. A)", bpm: 135, prog: [["C", "maj7", 1], ["C", "6", 1], ["D", "7", 1], ["D", "7", 1], ["D", "m7", 1], ["G", "7", 1], ["C", "maj7", 2, "G", "7"], ["C", "6", 1]] },
        { id: "std_blue_bossa", category: "Bossa", title: "Blue Bossa (8 Compases)", bpm: 125, prog: [["C", "m7", 1], ["F", "m7", 1], ["D", "m7b5", 1], ["G", "7", 1], ["C", "m7", 1], ["Eb", "m7", 2, "Ab", "7"], ["Db", "maj7", 1], ["D", "m7b5", 2, "G", "7"]] },
        { id: "std_stella", category: "Swing", title: "Stella By Starlight (Inicio)", bpm: 115, prog: [["E", "m7b5", 1], ["A", "7", 1], ["C", "m7", 1], ["F", "7", 1], ["F", "m7", 1], ["Bb", "7", 1], ["Eb", "maj7", 1], ["Ab", "7", 1]] },
        { id: "std_fly_me", category: "Swing", title: "Fly Me To The Moon", bpm: 120, prog: [["A", "m7", 1], ["D", "m7", 1], ["G", "7", 1], ["C", "maj7", 1], ["F", "maj7", 1], ["B", "m7b5", 1], ["E", "7", 1], ["A", "m7", 2, "A", "7"]] },
        { id: "std_there_will_never", category: "Swing", title: "There Will Never Be Another You", bpm: 130, prog: [["Eb", "maj7", 1], ["D", "m7b5", 2, "G", "7"], ["C", "m7", 1], ["Bb", "m7", 2, "Eb", "7"], ["Ab", "maj7", 1], ["Db", "7", 1], ["Eb", "maj7", 1], ["C", "m7", 1]] },
        { id: "std_body_and_soul", category: "Ballad", title: "Body and Soul (Sec. A)", bpm: 75, prog: [["Eb", "m7", 2, "Bb", "7"], ["Eb", "m7", 2, "D", "7"], ["Db", "maj7", 2, "Gb", "7"], ["F", "m7", 2, "E", "dim7"], ["Eb", "m7", 1], ["C", "m7b5", 2, "F", "7"], ["Bb", "m7", 2, "Eb", "7"], ["Ab", "maj7", 1]] },
        { id: "std_giant_steps", category: "Modal", title: "Giant Steps (Coltrane Changes)", bpm: 160, prog: [["B", "maj7", 2, "D", "7"], ["G", "maj7", 2, "Bb", "7"], ["Eb", "maj7", 1], ["A", "m7", 2, "D", "7"], ["G", "maj7", 2, "Bb", "7"], ["Eb", "maj7", 2, "F#", "7"], ["B", "maj7", 1], ["F", "m7", 2, "Bb", "7"]] },
        { id: "std_confirmation", category: "Bebop", title: "Confirmation (Charlie Parker)", bpm: 150, prog: [["F", "maj7", 1], ["E", "m7b5", 2, "A", "7"], ["D", "m7", 2, "G", "7"], ["C", "m7", 2, "F", "7"], ["Bb", "7", 1], ["A", "m7", 2, "D", "7"], ["G", "7", 1], ["G", "m7", 2, "C", "7"]] },
        { id: "std_anthropology", category: "Blues", title: "Anthropology (Rhythm Changes A)", bpm: 155, prog: [["Bb", "maj7", 2, "G", "7"], ["C", "m7", 2, "F", "7"], ["D", "m7", 2, "G", "7"], ["C", "m7", 2, "F", "7"], ["F", "m7", 2, "Bb", "7"], ["Eb", "maj7", 2, "Ab", "7"], ["D", "m7", 2, "G", "7"], ["C", "m7", 2, "F", "7"]] },
        { id: "std_oleo_bridge", category: "Blues", title: "Oleo (Rhythm Changes Bridge)", bpm: 155, prog: [["D", "7", 1], ["D", "7", 1], ["G", "7", 1], ["G", "7", 1], ["C", "7", 1], ["C", "7", 1], ["F", "7", 1], ["F", "7", 1]] },
        { id: "std_billies_bounce", category: "Blues", title: "Billie's Bounce (Jazz Blues en F)", bpm: 135, prog: [["F", "7", 1], ["Bb", "7", 1], ["F", "7", 1], ["C", "m7", 2, "F", "7"], ["Bb", "7", 1], ["B", "dim7", 1], ["F", "7", 2, "D", "7"], ["G", "m7", 2, "C", "7"]] },
        { id: "std_blue_monk", category: "Blues", title: "Blue Monk (Blues en Bb)", bpm: 110, prog: [["Bb", "7", 1], ["Eb", "7", 1], ["Bb", "7", 1], ["F", "m7", 2, "Bb", "7"], ["Eb", "7", 1], ["E", "dim7", 1], ["Bb", "7", 2, "G", "7"], ["C", "m7", 2, "F", "7"]] },
        { id: "std_equinox", category: "Blues", title: "Equinox (Minor Blues en Cm)", bpm: 115, prog: [["C", "m7", 1], ["F", "m7", 1], ["C", "m7", 1], ["G", "m7b5", 2, "C", "7"], ["F", "m7", 1], ["F", "m7", 1], ["C", "m7", 1], ["Ab", "7", 2, "G", "7"]] },
        { id: "std_satin_doll", category: "Swing", title: "Satin Doll (Duke Ellington)", bpm: 115, prog: [["D", "m7", 2, "G", "7"], ["D", "m7", 2, "G", "7"], ["E", "m7", 2, "A", "7"], ["E", "m7", 2, "A", "7"], ["A", "m7", 2, "D", "7"], ["Ab", "m7", 2, "Db", "7"], ["C", "maj7", 1], ["A", "7", 1]] },
        { id: "std_misty", category: "Ballad", title: "Misty (Erroll Garner)", bpm: 76, prog: [["Eb", "maj7", 1], ["Bb", "m7", 2, "Eb", "7"], ["Ab", "maj7", 1], ["Ab", "m7", 2, "Db", "7"], ["Eb", "maj7", 2, "C", "m7"], ["F", "m7", 2, "Bb", "7"], ["G", "m7", 2, "C", "7"], ["F", "m7", 2, "Bb", "7"]] },
        { id: "std_my_funny_valentine", category: "Ballad", title: "My Funny Valentine", bpm: 78, prog: [["C", "m7", 1], ["C", "mMaj7", 1], ["C", "m7", 1], ["C", "m6", 1], ["Ab", "maj7", 1], ["F", "m7", 1], ["D", "m7b5", 1], ["G", "7", 1]] },
        { id: "std_summertime", category: "Swing", title: "Summertime (Gershwin)", bpm: 105, prog: [["A", "m7", 2, "E", "7"], ["A", "m7", 1], ["E", "m7b5", 2, "A", "7"], ["D", "m7", 1], ["F", "7", 2, "E", "7"], ["A", "m7", 2, "D", "7"], ["C", "maj7", 2, "E", "7"], ["A", "m7", 1]] },
        { id: "std_ipanema", category: "Bossa", title: "The Girl From Ipanema", bpm: 120, prog: [["F", "maj7", 1], ["F", "6", 1], ["G", "7", 1], ["G", "7", 1], ["G", "m7", 1], ["Gb", "7", 1], ["F", "maj7", 1], ["Gb", "7", 1]] },
        { id: "std_wave", category: "Bossa", title: "Wave (Tom Jobim)", bpm: 125, prog: [["D", "maj7", 1], ["Bb", "dim7", 1], ["A", "m7", 1], ["D", "7", 1], ["G", "maj7", 1], ["G", "m6", 1], ["F#", "7", 2, "B", "7"], ["E", "7", 2, "A", "7"]] },
        { id: "std_black_orpheus", category: "Bossa", title: "Black Orpheus (Manhã de Carnaval)", bpm: 118, prog: [["A", "m7", 1], ["B", "m7b5", 2, "E", "7"], ["A", "m7", 1], ["B", "m7b5", 2, "E", "7"], ["A", "m7", 1], ["D", "m7", 2, "G", "7"], ["C", "maj7", 1], ["F", "maj7", 2, "E", "7"]] },
        { id: "std_desafinado", category: "Bossa", title: "Desafinado (Jobim)", bpm: 122, prog: [["F", "maj7", 1], ["G", "7", 1], ["G", "m7", 2, "C", "7"], ["A", "m7b5", 2, "D", "7"], ["G", "m7", 1], ["A", "m7b5", 2, "D", "7"], ["G", "maj7", 1], ["G", "m7", 2, "C", "7"]] },
        { id: "std_solar", category: "Modal", title: "Solar (Miles Davis)", bpm: 140, prog: [["C", "m7", 1], ["G", "m7", 2, "C", "7"], ["F", "maj7", 1], ["F", "m7", 2, "Bb", "7"], ["Eb", "maj7", 1], ["Eb", "m7", 2, "Ab", "7"], ["Db", "maj7", 1], ["D", "m7b5", 2, "G", "7"]] },
        { id: "std_tune_up", category: "Bebop", title: "Tune Up (Miles Davis)", bpm: 145, prog: [["E", "m7", 1], ["A", "7", 1], ["D", "maj7", 1], ["D", "maj7", 1], ["D", "m7", 1], ["G", "7", 1], ["C", "maj7", 1], ["C", "m7", 2, "F", "7"]] },
        { id: "std_afternoon_paris", category: "Bebop", title: "Afternoon in Paris (John Lewis)", bpm: 130, prog: [["C", "maj7", 1], ["C", "m7", 2, "F", "7"], ["Bb", "maj7", 1], ["Bb", "m7", 2, "Eb", "7"], ["Ab", "maj7", 1], ["D", "m7", 2, "G", "7"], ["C", "maj7", 2, "A", "m7"], ["D", "m7", 2, "G", "7"]] },
        { id: "std_lady_bird", category: "Bebop", title: "Lady Bird (Tadd Dameron)", bpm: 145, prog: [["C", "maj7", 1], ["F", "m7", 2, "Bb", "7"], ["C", "maj7", 1], ["Bb", "m7", 2, "Eb", "7"], ["Ab", "maj7", 1], ["A", "m7", 2, "D", "7"], ["D", "m7", 2, "G", "7"], ["C", "maj7", 2, "Eb", "7"]] },
        { id: "std_wine_and_roses", category: "Swing", title: "Days of Wine and Roses", bpm: 120, prog: [["F", "maj7", 1], ["Eb", "7", 1], ["D", "m7", 1], ["Bb", "m7", 2, "Eb", "7"], ["A", "m7", 1], ["D", "m7", 1], ["G", "m7", 1], ["C", "7", 1]] },
        { id: "std_cherokee", category: "Bebop", title: "Cherokee (Ray Noble)", bpm: 160, prog: [["Bb", "maj7", 1], ["F", "m7", 2, "Bb", "7"], ["Eb", "maj7", 1], ["Ab", "7", 1], ["Bb", "maj7", 1], ["C", "7", 1], ["C", "m7", 1], ["F", "7", 1]] },
        { id: "std_miss_jones", category: "Swing", title: "Have You Met Miss Jones?", bpm: 130, prog: [["F", "maj7", 1], ["D", "7", 1], ["G", "m7", 1], ["C", "7", 1], ["A", "m7", 1], ["D", "m7", 1], ["G", "m7", 1], ["C", "7", 1]] },
        { id: "std_donna_lee", category: "Bebop", title: "Donna Lee (Parker / Davis)", bpm: 155, prog: [["Ab", "maj7", 1], ["F", "7", 1], ["Bb", "7", 1], ["Bb", "7", 1], ["Bb", "m7", 1], ["Eb", "7", 1], ["Ab", "maj7", 1], ["Eb", "m7", 2, "Ab", "7"]] },
        { id: "std_ornithology", category: "Bebop", title: "Ornithology / How High The Moon", bpm: 145, prog: [["G", "maj7", 1], ["G", "m7", 2, "C", "7"], ["F", "maj7", 1], ["F", "m7", 2, "Bb", "7"], ["Eb", "maj7", 1], ["A", "m7b5", 2, "D", "7"], ["G", "maj7", 1], ["A", "m7", 2, "D", "7"]] },
        { id: "std_green_dolphin", category: "Modal", title: "On Green Dolphin Street", bpm: 130, prog: [["C", "maj7", 1], ["C", "m7", 1], ["D", "7", 1], ["Db", "maj7", 1], ["C", "maj7", 1], ["D", "m7", 2, "G", "7"], ["E", "m7", 2, "A", "7"], ["D", "m7", 2, "G", "7"]] },
        { id: "std_night_and_day", category: "Swing", title: "Night and Day (Cole Porter)", bpm: 125, prog: [["Db", "maj7", 1], ["C", "7", 1], ["F", "maj7", 1], ["F", "maj7", 1], ["F", "m7b5", 1], ["E", "m7", 2, "Eb", "dim7"], ["D", "m7", 2, "G", "7"], ["C", "maj7", 1]] },
        { id: "std_joy_spring", category: "Bebop", title: "Joy Spring (Clifford Brown)", bpm: 140, prog: [["F", "maj7", 1], ["G", "m7", 2, "C", "7"], ["F", "maj7", 1], ["Bb", "m7", 2, "Eb", "7"], ["Ab", "maj7", 1], ["A", "m7", 2, "D", "7"], ["G", "m7", 2, "C", "7"], ["F", "maj7", 1]] },
        { id: "std_alice_wonderland", category: "Modal", title: "Alice in Wonderland", bpm: 120, prog: [["D", "m7", 1], ["G", "7", 1], ["C", "maj7", 1], ["F", "maj7", 1], ["B", "m7b5", 1], ["E", "7", 1], ["A", "m7", 1], ["Eb", "7", 1]] }
    ];

    function buildMelodicExampleFromStandardSpec(spec) {
        const measures = spec.prog.map((barSpec, idx) => {
            const [root1, type1, split, root2, type2] = barSpec;
            const scale1Context = inferContextualScaleAndFunction(root1, type1, root2 || null, type2 || null);
            const scale2Context = split === 2
                ? inferContextualScaleAndFunction(root2, type2, null, null)
                : scale1Context;
            const harmonicRhythm = split === 2
                ? [
                    { root: root1, type: type1, startBeat: 0, durationBeats: 2, scaleId: scale1Context.id },
                    { root: root2, type: type2, startBeat: 2, durationBeats: 2, scaleId: scale2Context.id }
                ]
                : [{ root: root1, type: type1, startBeat: 0, durationBeats: 4, scaleId: scale1Context.id }];

            const scale1 = getChordScaleIntervals(type1, scale1Context.id);
            const scale2 = getChordScaleIntervals(split === 2 ? type2 : type1, scale2Context.id);
            const targetRoot = split === 2 ? root2 : root1;
            const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(targetRoot);
            const startNote = `${calculateNoteName(root1, scale1[2] || scale1[0])}/5`;
            const middleNote = `${calculateNoteName(root1, scale1[4] || scale1[1])}/5`;
            const targetNote = `${calculateNoteName(targetRoot, scale2[2] || scale2[0])}/5`;
            const targetMidi = getNoteWithOctaveMidi(targetNote);
            const chromaticApproach = midiToNoteWithOctave(targetMidi - 1, preferFlats);
            const notes = idx % 2 === 0
                ? [
                    { note: startNote, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: middleNote, dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: chromaticApproach, dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "chromatic_below" },
                    { note: targetNote, dur: "h", isWeakBeat: false, pOrS: "P" }
                ]
                : [
                    { note: middleNote, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: midiToNoteWithOctave(targetMidi + 1, preferFlats), dur: "16", isWeakBeat: true, pOrS: "S", groupType: "res_ret_start", defaultOpt: "del_cd" },
                    { note: `${calculateNoteName(targetRoot, scale2[1] || scale2[0])}/5`, dur: "16", isWeakBeat: true, pOrS: "S", groupType: "res_ret_end", defaultOpt: "del_cd" },
                    { note: targetNote, dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: startNote, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: targetNote, dur: "q", isWeakBeat: false, pOrS: "P" }
                ];
            const chordSymbol = split === 2
                ? `${displayNote(root1)}${chordStructures[type1]?.cifrado || ''} - ${displayNote(root2)}${chordStructures[type2]?.cifrado || ''}`
                : `${displayNote(root1)}${chordStructures[type1]?.cifrado || ''}`;

            return {
                bar: idx + 1, chordRoot: root1, chordTypeKey: type1, scaleId: scale1Context.id,
                chordSymbol, harmonicRhythm, notes
            };
        });

        return {
            id: spec.id, bars: measures.length, category: spec.category, bpm: spec.bpm,
            title: `🎷 ${spec.title} (${spec.category})`, measures
        };
    }

    JAZZ_STANDARDS_LIBRARY.forEach(spec => {
        MELODIC_ANALYSIS_EXAMPLES[spec.id] = buildMelodicExampleFromStandardSpec(spec);
    });

    function getMelodicExampleById(exId) {
        return MELODIC_ANALYSIS_EXAMPLES[exId]
            || (state.melodicStudio.customRandomExamples && state.melodicStudio.customRandomExamples[exId])
            || MELODIC_ANALYSIS_EXAMPLES['f3_4_1'];
    }

    function getBeatsForDuration(dur) {
        if (dur === 'w') return 4;
        if (dur === 'hd') return 3;
        if (dur === 'h') return 2;
        if (dur === 'qd') return 1.5;
        if (dur === 'q') return 1;
        if (dur === 'qt') return 2 / 3;
        if (dur === '8d') return 0.75;
        if (dur === '8') return 0.5;
        if (dur === '8t') return 1 / 3;
        if (dur === '16') return 0.25;
        if (dur === '16t') return 1 / 6;
        return 1;
    }

    function getCoherentChordRelationLabel(noteName, chordRoot, chordTypeKey) {
        const cData = chordStructures[chordTypeKey] || chordStructures['maj7'];
        const rootLetter = chordRoot.match(/[A-G]/i)?.[0]?.toUpperCase() || 'C';
        const noteLetter = noteName.match(/[A-G]/i)?.[0]?.toUpperCase() || 'C';
        const letterOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const degreeIndex = (letterOrder.indexOf(noteLetter) - letterOrder.indexOf(rootLetter) + 7) % 7;
        const naturalSemitones = [0, 2, 4, 5, 7, 9, 11][degreeIndex];
        const chromaticDistance = (getNoteSemitone(noteName) - getNoteSemitone(chordRoot) + 12) % 12;
        let alteration = chromaticDistance - naturalSemitones;
        if (alteration > 6) alteration -= 12;
        if (alteration < -6) alteration += 12;
        const accidental = alteration <= -2 ? 'bb'
            : alteration === -1 ? 'b'
                : alteration === 1 ? '#'
                    : alteration >= 2 ? '##' : '';
        const intervalNumbers = ['1', '9', '3', '11', '5', '13', '7'];
        let label = `${accidental}${intervalNumbers[degreeIndex]}`;
        const simpleLabel = `${accidental}${degreeIndex + 1}`;
        if (degreeIndex === 5 && alteration === 0) {
            label = ['6', 'm6', 'major', 'minor'].includes(chordTypeKey) ? '6' : '13';
        }
        const chordToneLabels = ['1', '3', 'b3', '5', 'b5', '#5', '6', '7', 'b7'];
        return {
            label,
            simpleLabel,
            isChordTone: chordToneLabels.includes(label)
                && cData.intervals.some(interval => interval.label === label)
        };
    }

    function getMelodicIntervalLabel(noteWithOctave, targetWithOctave) {
        const parsePitch = (pitch) => {
            const [noteName, octaveText] = String(pitch).split('/');
            const match = noteName.match(/^([A-G])([#b]*)$/);
            if (!match) return null;
            const letterIndex = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(match[1]);
            const octave = Number(octaveText);
            if (letterIndex < 0 || !Number.isInteger(octave)) return null;
            return { letterIndex, octave, midi: getNoteWithOctaveMidi(pitch) };
        };
        const source = parsePitch(noteWithOctave);
        const target = parsePitch(targetWithOctave);
        if (!source || !target) return '';

        const diatonicDistance = Math.abs(
            target.octave * 7 + target.letterIndex - (source.octave * 7 + source.letterIndex)
        );
        const intervalNumber = diatonicDistance + 1;
        const simpleNumber = ((intervalNumber - 1) % 7) + 1;
        const octaveCount = Math.floor((intervalNumber - 1) / 7);
        const naturalSemitones = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 }[simpleNumber];
        const expectedSemitones = octaveCount * 12 + naturalSemitones;
        const alteration = Math.abs(target.midi - source.midi) - expectedSemitones;
        const accidental = alteration <= -2 ? 'bb'
            : alteration === -1 ? 'b'
                : alteration === 1 ? '#'
                    : alteration >= 2 ? '##' : '';
        return `${accidental}${intervalNumber}`;
    }

    function getMelodicAnalysisNotation(note, classification, approachNotation = 'd') {
        const relation = getCoherentChordRelationLabel(
            note.note.split('/')[0],
            note.barChordRoot,
            note.barChordTypeKey
        );
        const isAvailableTension = !relation.isChordTone && Boolean(getChordScaleDefinition(
            note.barChordTypeKey,
            note.barScaleId
        )?.availTensions?.includes(relation.label));
        if (classification.id === 'class_DUAL_H') {
            if (note.groupType === 'dbl_chrom_start') {
                return isAvailableTension ? `T${relation.label}` : relation.label;
            }
            if (note.groupType === 'dbl_chrom_end') {
                return `${approachNotation}${relation.simpleLabel}`;
            }
            return isAvailableTension ? `T${relation.label}` : relation.label;
        }
        if (note.isMainMelodicNote || classification.pOrS === 'P') {
            return isAvailableTension ? `T${relation.label}` : relation.label;
        }
        if (note.analysisChromaticApproach
            || ((note.groupType === 'dbl_chrom_start' || note.groupType === 'dbl_chrom_end')
                && note.analysisDoubleChromaticValid)) {
            return 'c';
        }
        const isDiatonicApproach = note.analysisDiatonicToScale
            && (!note.isMainMelodicNote || classification.pOrS !== 'P');
        if (isDiatonicApproach) {
            return `${approachNotation}${relation.simpleLabel}`;
        }
        return isAvailableTension ? `T${relation.label}` : relation.label;
    }

    function isDiatonicStepToTarget(note, target) {
        if (!note || !target || note === target) return false;
        const scale = getChordScaleIntervals(target.barChordTypeKey, target.barScaleId);
        const scalePitchClasses = scale.map(interval => getNoteSemitone(calculateNoteName(target.barChordRoot, interval)));
        const noteDegree = scalePitchClasses.indexOf(getNoteSemitone(note.note.split('/')[0]));
        const targetDegree = scalePitchClasses.indexOf(getNoteSemitone(target.note.split('/')[0]));
        if (noteDegree < 0 || targetDegree < 0) return false;
        const degreeDistance = Math.abs(noteDegree - targetDegree);
        const scaleDistance = Math.min(degreeDistance, scale.length - degreeDistance);
        return scaleDistance === 1
            && Math.abs(getNoteWithOctaveMidi(target.note) - getNoteWithOctaveMidi(note.note)) <= 2;
    }

    function isStepwiseMelodicMotion(note, target) {
        if (!note || !target || note === target) return false;
        const distance = Math.abs(getNoteWithOctaveMidi(target.note) - getNoteWithOctaveMidi(note.note));
        return distance === 1 || distance === 2;
    }

    // Punto 2: Calcula en cada compás qué acorde y escala contextual rigen según el tiempo exacto (tiempos 1-2 vs tiempos 3-4)
    function getActiveChordForMeasureBeat(measureObj, beatInBar, nextMeasureObj = null) {
        const hr = (measureObj && Array.isArray(measureObj.harmonicRhythm) && measureObj.harmonicRhythm.length)
            ? measureObj.harmonicRhythm
            : [{ root: measureObj?.chordRoot || 'C', type: measureObj?.chordTypeKey || 'maj7', startBeat: 0, durationBeats: 4, scaleId: measureObj?.scaleId || null }];
        let matchedIdx = hr.findIndex(seg => beatInBar >= seg.startBeat - 0.01 && beatInBar < seg.startBeat + seg.durationBeats - 0.01);
        if (matchedIdx === -1) matchedIdx = hr.length - 1;
        const matched = hr[matchedIdx];
        const nextSeg = hr[matchedIdx + 1] || (nextMeasureObj && nextMeasureObj.harmonicRhythm ? nextMeasureObj.harmonicRhythm[0] : (nextMeasureObj ? { root: nextMeasureObj.chordRoot, type: nextMeasureObj.chordTypeKey } : null));
        const scaleObj = inferContextualScaleAndFunction(matched.root, matched.type, nextSeg?.root, nextSeg?.type, matched.scaleId || measureObj?.scaleId);
        const sym = displayNote(matched.root) + (chordStructures[matched.type]?.cifrado || '');
        return { root: matched.root, type: matched.type, sym, scaleId: scaleObj.id, scaleName: scaleObj.name, funcName: scaleObj.func };
    }

    function getFlattenedNotesFromExample(exId) {
        const ex = getMelodicExampleById(exId);
        const rawFlat = [];
        let gIdx = 0;

        ex.measures.forEach((m, mIdx) => {
            let beatCursor = 0;
            const nextM = ex.measures[mIdx + 1] || null;
            m.notes.forEach((n, nIdx) => {
                const bVal = getBeatsForDuration(n.dur);
                const segChord = getActiveChordForMeasureBeat(m, beatCursor, nextM);
                rawFlat.push({
                    ...n,
                    sourceNote: n.note,
                    note: state.melodicStudio.enharmonicNoteSpellingByNote[gIdx]
                        ? `${state.melodicStudio.enharmonicNoteSpellingByNote[gIdx]}/${n.note.split('/')[1]}`
                        : n.note,
                    globalIdx: gIdx,
                    measureIdx: mIdx,
                    noteIdxInMeasure: nIdx,
                    bar: m.bar,
                    startBeatInBar: beatCursor,
                    barChordRoot: segChord.root,
                    barChordTypeKey: segChord.type,
                    barChordSymbol: segChord.sym,
                    barScaleId: segChord.scaleId,
                    barScaleName: segChord.scaleName,
                    barFuncName: segChord.funcName
                });
                beatCursor += bVal;
                gIdx++;
            });
        });

        rawFlat.forEach((item, idx) => {
            if (item.isRest) return;
            const relation = getCoherentChordRelationLabel(item.note.split('/')[0], item.barChordRoot, item.barChordTypeKey);
            const nextPlayable = rawFlat.slice(idx + 1).find(note => !note.isRest) || item;
            const nextMove = nextPlayable === item
                ? 0
                : Math.abs(getNoteWithOctaveMidi(nextPlayable.note) - getNoteWithOctaveMidi(item.note));
            const durationBeats = getBeatsForDuration(item.dur);
            let restDuration = 0;
            for (let nextIdx = idx + 1; nextIdx < rawFlat.length && rawFlat[nextIdx].isRest; nextIdx++) {
                restDuration += getBeatsForDuration(rawFlat[nextIdx].dur);
            }
            const isExplicitApproachGroup = ['res_ret_start', 'res_ret_end', 'dbl_chrom_start', 'dbl_chrom_end'].includes(item.groupType);
            const isShortStructuralNote = durationBeats < 1 && (
                nextPlayable !== item && nextMove > 2
                || restDuration >= durationBeats
                || item.isWeakBeat === false && nextPlayable.isWeakBeat === true
            );
            item.isMainMelodicNote = !isExplicitApproachGroup && (
                relation.isChordTone
                || durationBeats >= 1
                || isShortStructuralNote
            );
        });

        rawFlat.forEach((item, idx) => {
            if (item.isRest || item.isMainMelodicNote) return;
            const isExplicitApproachGroup = ['res_ret_start', 'res_ret_end', 'dbl_chrom_start', 'dbl_chrom_end'].includes(item.groupType);
            const nextMainNote = rawFlat.slice(idx + 1).find(note => !note.isRest && note.isMainMelodicNote);
            const nextPlayable = nextMainNote || rawFlat.slice(idx + 1).find(note => !note.isRest);
            item.isSecondaryApproach = Boolean(isExplicitApproachGroup || (
                nextPlayable && (
                    isDiatonicStepToTarget(item, nextPlayable)
                    || isStepwiseMelodicMotion(item, nextPlayable)
                )
            ));
            if (!item.isSecondaryApproach) item.isMainMelodicNote = true;
        });

        rawFlat.forEach((item, idx) => {
            if (item.isRest) return;
            const isRetardationStart = item.groupType === 'res_ret_start' || item.groupType === 'dbl_chrom_start';
            const isDoubleChromaticEnd = item.groupType === 'dbl_chrom_end';
            const target = isRetardationStart
                ? rawFlat.slice(idx + 2).find(note => !note.isRest)
                : isDoubleChromaticEnd
                    ? rawFlat.slice(idx + 1).find(note => !note.isRest)
                    : rawFlat.slice(idx + 1).find(note => !note.isRest && note.isMainMelodicNote)
                        || rawFlat.slice(idx + 1).find(note => !note.isRest);
            const analysisTarget = target || item;
            item.analysisTargetNoteObj = analysisTarget;
            item.analysisDiatonicToScale = isDiatonicStepToTarget(item, analysisTarget);
            item.analysisChromaticApproach = isStepwiseMelodicMotion(item, analysisTarget)
                && !item.analysisDiatonicToScale;
        });

        // Analizador Melódico con Doble Análisis (Nota de Acorde usada como Aproximación), Resoluciones Retardadas según clasificación y Tonicizaciones de 2 y 3 acordes
        rawFlat.forEach((item, idx) => {
            if (item.isRest) {
                item.classifications = [{ id: 'class_REST', pOrS: 'R', shortTag: '𝄽 Silencio', title: 'Silencio Rítmico', explain: 'Tiempo en silencio.', options: [], separateIndLeadOptions: [], separateTonicOptions: [], defaultOpt: 'none' }];
                item.activeClassObj = item.classifications[0];
                return;
            }
            const nextPlayable = rawFlat.slice(idx + 1).find(x => !x.isRest) || item;
            const next2Playable = rawFlat.slice(rawFlat.indexOf(nextPlayable) + 1).find(x => !x.isRest) || nextPlayable;
            const prevPlayable = rawFlat.slice(0, idx).reverse().find(x => !x.isRest) || item;

            const isResRetGroup = item.groupType === 'res_ret_start' || item.groupType === 'res_ret_end';
            const isDblChromGroup = item.groupType === 'dbl_chrom_start' || item.groupType === 'dbl_chrom_end';
            const targetNode = item.analysisTargetNoteObj || nextPlayable;
            const relOwn = getCoherentChordRelationLabel(item.note.split('/')[0], item.barChordRoot, item.barChordTypeKey);
            const ownScaleDefinition = getChordScaleDefinition(item.barChordTypeKey, item.barScaleId);
            const ownIsAvailableTension = !relOwn.isChordTone
                && Boolean(ownScaleDefinition?.availTensions?.includes(relOwn.label));
            const scaleIntervals = getChordScaleIntervals(item.barChordTypeKey, item.barScaleId);
            const notePc = getNoteSemitone(item.note.split('/')[0]);
            const melodyIsAvailableForTarget = isChordToneOrAvailableTension(
                targetNode.note.split('/')[0],
                targetNode.barChordRoot,
                targetNode.barChordTypeKey,
                targetNode.barScaleId
            );
            item.analysisTargetNote = targetNode.note;
            const isDiatonicToMomentScale = scaleIntervals.some(s => getNoteSemitone(calculateNoteName(item.barChordRoot, s)) === notePc);

            const pOpts = ['principal_4way', 'principal_var1', 'principal_var2', 'principal_var3', 'ambi_a', 'ambi_b', 'ambi_c'];
            const move = getNoteWithOctaveMidi(targetNode.note) - getNoteWithOctaveMidi(item.note);
            const sOpts = [];
            const sepIndLeadOpts = [];
            const targetIsMajor = targetNode.barChordTypeKey === 'maj7' || targetNode.barChordTypeKey === 'major' || targetNode.barChordTypeKey === '7';
            const targetIsDim = targetNode.barChordTypeKey === 'dim7' || targetNode.barChordTypeKey === 'diminished';

            // Catálogo completo de Tonicizaciones de 2 y 3 acordes disponibles cuando el acorde objetivo no es disminuido
            const sepTonic2Opts = targetIsDim ? [] : ['tonic_V7_I', 'tonic_VIIo7_I', 'tonic_bII7_I', 'tonic_bVII7_I'];
            const sepTonic3Opts = [];
            let hasStepwiseApproachGroup = true;
            if (!targetIsDim && targetIsMajor) sepTonic2Opts.push('tonic_VII7_I');

            if (isResRetGroup) {
                // Evaluar exactamente el análisis de la 1ª y 2ª nota de la Resolución Retardada respecto al objetivo (ej. F - D - E en Cmaj7)
                const n1 = item.groupType === 'res_ret_start' ? item : prevPlayable;
                const n2 = item.groupType === 'res_ret_start' ? nextPlayable : item;
                const tGoal = item.groupType === 'res_ret_start' ? next2Playable : nextPlayable;

                const dist1 = Math.abs(getNoteWithOctaveMidi(tGoal.note) - getNoteWithOctaveMidi(n1.note));
                const dist2 = Math.abs(getNoteWithOctaveMidi(tGoal.note) - getNoteWithOctaveMidi(n2.note));
                const n1Pc = getNoteSemitone(n1.note.split('/')[0]);
                const n2Pc = getNoteSemitone(n2.note.split('/')[0]);
                const goalScale = getChordScaleIntervals(tGoal.barChordTypeKey, tGoal.barScaleId);

                const n1IsStepwise = dist1 === 1 || dist1 === 2;
                const n2IsStepwise = dist2 === 1 || dist2 === 2;
                hasStepwiseApproachGroup = n1IsStepwise && n2IsStepwise;
                const n1InScale = goalScale.some(s => getNoteSemitone(calculateNoteName(tGoal.barChordRoot, s)) === n1Pc);
                const n2InScale = goalScale.some(s => getNoteSemitone(calculateNoteName(tGoal.barChordRoot, s)) === n2Pc);
                const n1CanBeDiat = n1IsStepwise && n1InScale;
                const n1CanBeChrom = n1IsStepwise && !n1InScale;
                const n2CanBeDiat = n2IsStepwise && n2InScale;
                const n2CanBeChrom = n2IsStepwise && !n2InScale;
                const retardationIsValid = hasStepwiseApproachGroup && melodyIsAvailableForTarget;
                n1.analysisRetardationValid = retardationIsValid;
                n2.analysisRetardationValid = retardationIsValid;

                // Filtrar estrictamente entre a) Diatónico-Cromático, b) Cromático-Diatónico, c) Cromático-Cromático, d) Diatónico-Diatónico
                if (n1CanBeDiat && n2CanBeChrom) sOpts.push('del_dc');
                if (n1CanBeChrom && n2CanBeDiat) sOpts.push('del_cd');
                if (n1CanBeChrom && n2CanBeChrom) sOpts.push('del_cc');
                if (n1CanBeDiat && n2CanBeDiat) sOpts.push('del_dd');
                // Agregar las otras variantes posibles según el análisis (Paralelo, Disminuido, Dominante)
                if (n1CanBeChrom && dist2 === 2) sOpts.push('del_chrom_par');
                if (dist1 === 2 && n2CanBeChrom) sOpts.push('del_par_chrom');
                if (n1IsStepwise && n2CanBeDiat) sOpts.push('del_dom_diat', 'del_dim_diat');
                if (n1CanBeDiat) sOpts.push('del_diat_dom');

                if (!targetIsDim && hasStepwiseApproachGroup) {
                    sepTonic3Opts.push('tonic_II_V_I', 'tonic_V7ofV_V_I', 'tonic_II_bII_I', 'tonic_bVI_bII_I');
                    if (targetIsMajor) sepTonic3Opts.push('tonic_IVm_bVII_I', 'tonic_sIVm7b5_VII7_I');
                }
            } else if (isDblChromGroup) {
                const doubleChromStart = item.groupType === 'dbl_chrom_start'
                    ? item
                    : prevPlayable.groupType === 'dbl_chrom_start' ? prevPlayable : null;
                const doubleChromMiddle = item.groupType === 'dbl_chrom_end' ? item : nextPlayable;
                const doubleChromTarget = item.groupType === 'dbl_chrom_start'
                    ? next2Playable
                    : rawFlat.slice(idx + 1).find(note => !note.isRest);
                const startToTarget = doubleChromStart && doubleChromTarget
                    ? Math.abs(getNoteWithOctaveMidi(doubleChromTarget.note) - getNoteWithOctaveMidi(doubleChromStart.note))
                    : Infinity;
                const middleToTarget = doubleChromMiddle && doubleChromTarget
                    ? Math.abs(getNoteWithOctaveMidi(doubleChromTarget.note) - getNoteWithOctaveMidi(doubleChromMiddle.note))
                    : Infinity;
                const startToMiddleMotion = doubleChromStart && doubleChromMiddle
                    ? getNoteWithOctaveMidi(doubleChromMiddle.note) - getNoteWithOctaveMidi(doubleChromStart.note)
                    : 0;
                const middleToTargetMotion = doubleChromMiddle && doubleChromTarget
                    ? getNoteWithOctaveMidi(doubleChromTarget.note) - getNoteWithOctaveMidi(doubleChromMiddle.note)
                    : 0;
                const notesMoveByStep = doubleChromStart && doubleChromMiddle
                    && isStepwiseMelodicMotion(doubleChromStart, doubleChromMiddle)
                    && Math.sign(startToMiddleMotion) === Math.sign(middleToTargetMotion);
                hasStepwiseApproachGroup = Boolean(notesMoveByStep
                    && startToTarget <= 2 && startToTarget >= 1
                    && middleToTarget <= 2 && middleToTarget >= 1);
                const doubleChromaticIsValid = melodyIsAvailableForTarget && hasStepwiseApproachGroup;
                if (doubleChromStart) doubleChromStart.analysisDoubleChromaticValid = doubleChromaticIsValid;
                if (doubleChromMiddle) doubleChromMiddle.analysisDoubleChromaticValid = doubleChromaticIsValid;
                if (melodyIsAvailableForTarget && hasStepwiseApproachGroup) {
                    sOpts.push('double_chrom');
                }
                if (!targetIsDim && hasStepwiseApproachGroup) {
                    sepTonic3Opts.push('tonic_II_V_I', 'tonic_V7ofV_V_I', 'tonic_II_bII_I', 'tonic_bVI_bII_I');
                    if (targetIsMajor) sepTonic3Opts.push('tonic_IVm_bVII_I', 'tonic_sIVm7b5_VII7_I');
                }
            } else {
                if (melodyIsAvailableForTarget && item.analysisDiatonicToScale && isStepwiseMelodicMotion(item, targetNode)) sOpts.push('diatonic');
                else if (melodyIsAvailableForTarget && item.analysisChromaticApproach && isStepwiseMelodicMotion(item, targetNode)) sOpts.push(move > 0 ? 'chromatic_below' : 'chromatic_above');
                if (targetNode !== item && melodyIsAvailableForTarget && Math.abs(move) <= 2 && Math.abs(move) > 0) {
                    if (Math.abs(move) === 1) {
                        sepIndLeadOpts.push(move > 0 ? 'ind_3' : 'ind_4');
                    } else {
                        sepIndLeadOpts.push(move > 0 ? 'ind_1' : 'ind_2');
                    }
                } else if (targetNode !== item && melodyIsAvailableForTarget && move === 0) {
                    sepIndLeadOpts.push('ind_5', 'ind_6');
                }
                if (item.isMainMelodicNote && targetNode !== item && Math.abs(move) <= 2) {
                    sOpts.push('parallel', 'dominant', 'diminished');
                }
            }
            if ((isResRetGroup || isDblChromGroup) && (!melodyIsAvailableForTarget || !hasStepwiseApproachGroup)) {
                sOpts.length = 0;
                sepTonic2Opts.length = 0;
                sepTonic3Opts.length = 0;
            }
            const sepTonicOpts = [...sepTonic2Opts, ...sepTonic3Opts];

            // Configurar targetRoot y targetLeadLabel
            const ownCData = chordStructures[item.barChordTypeKey] || chordStructures['maj7'];
            const tRel = getCoherentChordRelationLabel(targetNode.note.split('/')[0], targetNode.barChordRoot, targetNode.barChordTypeKey);
            const tCData = chordStructures[targetNode.barChordTypeKey] || chordStructures['maj7'];

            item.classifications = [];
            const canApproachNext = targetNode !== item && (
                item.analysisDiatonicToScale
                || item.analysisChromaticApproach
                || isResRetGroup
                || isDblChromGroup
            );
            const hasDualAnalysis = !isResRetGroup && !isDblChromGroup && canApproachNext && (relOwn.isChordTone || isDiatonicToMomentScale);

            if (item.isMainMelodicNote && !isResRetGroup && !isDblChromGroup) {
                item.targetRoot = item.barChordRoot;
                item.targetType = item.barChordTypeKey;
                item.targetLeadLabel = ownCData.voicing_rules[relOwn.label] ? relOwn.label : '3';
                item.classifications.push({
                    id: 'class_P', pOrS: 'P', shortTag: `I:${relOwn.label}`,
                    title: `Nota principal • ${relOwn.isChordTone ? `I:${relOwn.label}` : `T:${relOwn.label}`} (${item.barChordSymbol})`,
                    explain: `${relOwn.isChordTone ? `Es ${relOwn.label} del acorde` : `Es una tensión ${relOwn.label}`} ${item.barChordSymbol}; por duración o comportamiento melódico se considera nota principal.`,
                    options: pOpts,
                    separateIndLeadOptions: [],
                    separateTonicOptions: [],
                    defaultOpt: 'principal_4way'
                });
                // Doble Análisis: Nota de acorde que también puede usarse como aproximación hacia la siguiente nota objetivo
                if (canApproachNext && sOpts.length > 0) {
                    item.classifications.push({
                        id: 'class_DUAL_S', pOrS: 'S', shortTag: `I:${relOwn.label}/S`,
                        title: `Doble función • nota del acorde y aproximación a ${formatScientificPitch(targetNode.note)}`,
                        explain: `${formatScientificPitch(item.note)} pertenece a ${item.barChordSymbol} como grado ${relOwn.label} y también puede conducir a ${formatScientificPitch(targetNode.note)}.`,
                        options: Array.from(new Set(sOpts)),
                        separateIndLeadOptions: Array.from(new Set(sepIndLeadOpts)),
                        separateTonicOptions: Array.from(new Set(sepTonicOpts)),
                        defaultOpt: sOpts[0] || 'diatonic'
                    });
                }
            } else {
                item.targetRoot = targetNode.barChordRoot;
                item.targetType = targetNode.barChordTypeKey;
                item.targetLeadLabel = tCData.voicing_rules[tRel.label] ? tRel.label : '3';
                const dualTagPrefix = (Math.abs(move) === 1 && isDiatonicToMomentScale)
                    ? `S(${relOwn.label}:d/cr)`
                    : (relOwn.isChordTone ? `S(${relOwn.label}:NA/Ap)` : `S(${relOwn.label})`);

                item.classifications.push({
                    id: 'class_S', pOrS: 'S', shortTag: dualTagPrefix,
                    title: hasDualAnalysis
                        ? `Doble función • grado ${relOwn.label} y aproximación a ${formatScientificPitch(targetNode.note)}`
                        : `Aproximación conjunta a ${formatScientificPitch(targetNode.note)}`,
                    explain: isResRetGroup
                        ? `Resolución Retardada hacia ${formatScientificPitch(targetNode.note)}: muestra únicamente las combinaciones válidas según el análisis melódico de ambas notas en disposición cerrada.`
                        : `Esta nota se armoniza junto con ${formatScientificPitch(targetNode.note)}, que es el objetivo (${targetNode.barChordSymbol}).`,
                    options: Array.from(new Set(sOpts)),
                    separateIndLeadOptions: Array.from(new Set(sepIndLeadOpts)),
                    separateTonicOptions: Array.from(new Set(sepTonicOpts)),
                    defaultOpt: (item.defaultOpt && sOpts.includes(item.defaultOpt)) ? item.defaultOpt : (sOpts[0] || 'none')
                });
                if ((isDblChromGroup && item.analysisDoubleChromaticValid)
                    || (item.analysisDiatonicToScale && ownIsAvailableTension)) {
                    item.classifications.push({
                        id: 'class_DUAL_H',
                        pOrS: 'P',
                        shortTag: `H:${ownIsAvailableTension ? `T${relOwn.label}` : relOwn.label}`,
                        title: isDblChromGroup
                            ? `Análisis armónico alternativo • relación con ${item.barChordSymbol}`
                            : `Tensión disponible • ${relOwn.label} de ${item.barChordSymbol}`,
                        explain: isDblChromGroup
                            ? `Alternativa al análisis cromático: muestra la relación de esta nota con ${item.barChordSymbol} y permite armonizarla como nota del acorde.`
                            : `Alternativa al análisis de aproximación: muestra la tensión disponible de esta nota sobre ${item.barChordSymbol}.`,
                        options: pOpts,
                        separateIndLeadOptions: [],
                        separateTonicOptions: [],
                        defaultOpt: 'principal_4way'
                    });
                }

            }
            const savedClassId = state.melodicStudio.selectedClassificationByNote[item.globalIdx];
            item.activeClassObj = item.classifications.find(c => c.id === savedClassId) || item.classifications[0];
        });

        return rawFlat;
    }

    // Devuelve las permutaciones válidas según el acorde armonizado, garantizando que no se repitan notas destino
    function getValidPerpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63(noteObj, baseVoicingObj, activePermIds = []) {
        if (!noteObj || noteObj.isRest || !baseVoicingObj || !Array.isArray(baseVoicingObj.notesWithOct)) return [];
        const effRoot = baseVoicingObj.effectiveBassRoot || noteObj.targetRoot || noteObj.barChordRoot || 'C';
        const effType = baseVoicingObj.effectiveChordTypeKey || noteObj.targetType || noteObj.barChordTypeKey || 'maj7';
        const baseNotes = baseVoicingObj.notesWithOct.slice(0, 4);
        const basePcs = baseNotes.map(n => getNoteSemitone(n.split('/')[0]));
        const normalizeRole = (r) => (r === 'b3' ? '3' : (r === 'b7' ? '7' : (r === 'b5' ? '5' : r)));
        const innerRoles = (baseVoicingObj.labels || []).slice(1, 4).map(l => normalizeRole((l || '').split(' ')[0]));

        const allPermKeys = Object.keys(HARMONIZATION_TECHNIQUES_CATALOG).filter(k => k.startsWith('perm_'));
        const activePermObjs = activePermIds.map(id => HARMONIZATION_TECHNIQUES_CATALOG[id]).filter(Boolean);

        return allPermKeys.filter(pid => {
            const pObj = HARMONIZATION_TECHNIQUES_CATALOG[pid];
            if (!pObj || !pObj.subInt) return false;
            if (!pObj.allowedTypes.includes(effType)) return false;

            const voiceIdxInInner = innerRoles.indexOf(pObj.targetRole);
            if (voiceIdxInInner === -1) return false;
            const actualVoiceIdx = voiceIdxInInner + 1;

            if (pObj.requireLeadRoot) {
                const leadName = baseNotes[0].split('/')[0];
                const leadPc = getNoteSemitone(leadName);
                const rootPc = getNoteSemitone(effRoot);
                const leadLabel = (baseVoicingObj.labels && baseVoicingObj.labels[0]) ? (baseVoicingObj.labels[0].split(' ')[0]) : '';
                const isLeadRoot = leadLabel === '1' || leadPc === rootPc;
                if (!isLeadRoot) return false;
            }

            if (activePermIds.includes(pid)) return true;

            const newNoteName = calculateNoteName(effRoot, pObj.subInt);
            const newPc = getNoteSemitone(newNoteName);
            const topMidi = getNoteWithOctaveMidi(baseNotes[0]);
            const topPc = ((topMidi % 12) + 12) % 12;
            const semitonesBelowLead = ((topPc - newPc) % 12 + 12) % 12;
            if (semitonesBelowLead === 1) return false;
            const collidesWithBase = basePcs.some((pc, idx) => idx !== actualVoiceIdx && pc === newPc);
            if (collidesWithBase) return false;

            const collidesWithActivePerm = activePermObjs.some(actObj => {
                if (actObj.targetRole === pObj.targetRole) return true;
                const actNoteName = calculateNoteName(effRoot, actObj.subInt);
                return getNoteSemitone(actNoteName) === newPc || actObj.subInt.semitones === pObj.subInt.semitones;
            });
            return !collidesWithActivePerm;
        });
    }

    function isStandaloneHarmonizationTechnique(techId) {
        return Boolean(HARMONIZATION_TECHNIQUES_CATALOG[techId]?.isStandaloneAllowed);
    }

    function ChosenIs3ChordTonic(techId) {
        return ['tonic_II_V_I', 'tonic_V7ofV_V_I', 'tonic_II_bII_I', 'tonic_bVI_bII_I', 'tonic_IVm_bVII_I', 'tonic_sIVm7b5_VII7_I'].includes(techId);
    }

    function getTWXh8n73LuT5MJ23pd8dCjFskRZckveFbP(techId, targetRoot, targetTypeKey) {
        const root = targetRoot || 'C';
        const type = targetTypeKey || 'maj7';
        const isMinor = type === 'm7' || type === 'minor';
        const target = displayNote(root) + (chordStructures[type]?.cifrado || '');
        const ii = displayNote(calculateNoteName(root, { semitones: 2, degreeOffset: 1 }));
        const v = displayNote(calculateNoteName(root, { semitones: 7, degreeOffset: 4 }));
        const bII = displayNote(calculateNoteName(root, { semitones: 1, degreeOffset: 1 }));
        const vii = displayNote(calculateNoteName(root, { semitones: 11, degreeOffset: 6 }));
        const bVII = displayNote(calculateNoteName(root, { semitones: 10, degreeOffset: 6 }));
        const bVI = displayNote(calculateNoteName(root, { semitones: 8, degreeOffset: 5 }));
        const iv = displayNote(calculateNoteName(root, { semitones: 5, degreeOffset: 3 }));
        const sharpIV = displayNote(calculateNoteName(root, { semitones: 6, degreeOffset: 3 }));
        const previews = {
            tonic_V7_I: `🔗 [2 Acordes] ${v}${isMinor ? '7(b9)' : '7'} ➔ ${target}`,
            tonic_VIIo7_I: `🔗 [2 Acordes] ${vii}º7 ➔ ${target}`,
            tonic_bII7_I: `🔗 [2 Acordes] ${bII}7(#11) ➔ ${target}`,
            tonic_bVII7_I: `🔗 [2 Acordes] ${bVII}7(#11) ➔ ${target}`,
            tonic_VII7_I: `🔗 [2 Acordes] ${vii}7 ➔ ${target}`,
            tonic_II_V_I: `🔗🔗 [3 Acordes] ${ii}${isMinor ? 'm7(b5)' : 'm7'} ➔ ${v}${isMinor ? '7(b9)' : '7'} ➔ ${target}`,
            tonic_V7ofV_V_I: `🔗🔗 [3 Acordes] ${ii}7 ➔ ${v}7 ➔ ${target}`,
            tonic_II_bII_I: `🔗🔗 [3 Acordes] ${ii}${isMinor ? 'm7(b5)' : 'm7'} ➔ ${bII}7 ➔ ${target}`,
            tonic_bVI_bII_I: `🔗🔗 [3 Acordes] ${bVI}m7 ➔ ${bII}7 ➔ ${target}`,
            tonic_IVm_bVII_I: `🔗🔗 [3 Acordes] ${iv}m7 ➔ ${bVII}7 ➔ ${target}`,
            tonic_sIVm7b5_VII7_I: `🔗🔗 [3 Acordes] ${sharpIV}m7(b5) ➔ ${vii}7(b9) ➔ ${target}`
        };
        return previews[techId] || '';
    }

    function getGroupIndicesForHarmonization(noteObj, chosenTechId, notesList) {
        if (!noteObj || !chosenTechId || isStandaloneHarmonizationTechnique(chosenTechId)) {
            return [noteObj.globalIdx];
        }
        const idx = noteObj.globalIdx;
        if ((noteObj.groupType === 'res_ret_start' || noteObj.groupType === 'res_ret_end')
            && !noteObj.analysisRetardationValid) return [idx];
        if ((noteObj.groupType === 'dbl_chrom_start' || noteObj.groupType === 'dbl_chrom_end')
            && !noteObj.analysisDoubleChromaticValid) return [idx];
        if (chosenTechId.startsWith('ind_')) {
            const targetIdx = noteObj.analysisTargetNoteObj?.globalIdx;
            return targetIdx !== undefined && targetIdx > idx && !notesList[targetIdx]?.isRest
                ? [idx, targetIdx]
                : [idx];
        }
        if (chosenTechId.startsWith('del_') || chosenTechId === 'double_chrom' ||
            noteObj.groupType === 'res_ret_start' || noteObj.groupType === 'res_ret_end' ||
            noteObj.groupType === 'dbl_chrom_start' || noteObj.groupType === 'dbl_chrom_end' ||
            ChosenIs3ChordTonic(chosenTechId)) {
            const startIdx = (noteObj.groupType === 'res_ret_end' || noteObj.groupType === 'dbl_chrom_end') ? Math.max(0, idx - 1) : idx;
            return [startIdx, startIdx + 1, startIdx + 2].filter(i => i >= 0 && i < notesList.length && !notesList[i].isRest);
        }
        const nextPlayable = notesList.slice(idx + 1).find(n => !n.isRest);
        return nextPlayable ? [idx, nextPlayable.globalIdx] : [idx];
    }

    function getTechniqueForGroupStep(chosenTechId, position, groupLength) {
        if (position === groupLength - 1) return 'principal_4way';
        if (ChosenIs3ChordTonic(chosenTechId) && groupLength === 3 && position === 1) {
            const middleMap = {
                tonic_II_V_I: 'tonic_V7_I',
                tonic_V7ofV_V_I: 'tonic_V7_I',
                tonic_II_bII_I: 'tonic_bII7_I',
                tonic_bVI_bII_I: 'tonic_bII7_I',
                tonic_IVm_bVII_I: 'tonic_bVII7_I',
                tonic_sIVm7b5_VII7_I: 'tonic_VII7_I'
            };
            return middleMap[chosenTechId] || 'tonic_V7_I';
        }
        return chosenTechId;
    }

    function harmonizeNoteOrGroupInStudio(noteObj, chosenTechId) {
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const groupIndices = getGroupIndicesForHarmonization(noteObj, chosenTechId, notesList);
        if (chosenTechId.startsWith('ind_') && groupIndices.length > 1) {
            const disposition = state.melodicStudio.voicingDispositionByNote[noteObj.globalIdx]
                || state.melodicStudio.voicingDisposition
                || 'close';
            state.melodicStudio.voicingDispositionByNote[groupIndices[groupIndices.length - 1]] = disposition;
        }
        if (groupIndices.length <= 1) {
            state.melodicStudio.selectedHarmonizationByNote[noteObj.globalIdx] = chosenTechId;
            state.melodicStudio.autoFilledPhraseVoicings[noteObj.globalIdx] = computeHarmonizationForMelodicNote(noteObj, chosenTechId);
            return [noteObj.globalIdx];
        }
        groupIndices.forEach((gIdx, pos) => {
            const n = notesList[gIdx];
            if (!n || n.isRest) return;
            const techForStep = getTechniqueForGroupStep(chosenTechId, pos, groupIndices.length);
            state.melodicStudio.selectedHarmonizationByNote[gIdx] = techForStep;
            state.melodicStudio.autoFilledPhraseVoicings[gIdx] = computeHarmonizationForMelodicNote(n, techForStep);
        });
        return groupIndices;
    }

    function computeHarmonizationForMelodicNote(noteObj, techniqueId = null, skipPermutationsAndDrops = false) {
        if (!noteObj || noteObj.isRest) {
            return { techniqueId: 'none', labels: [], notesWithOct: [], implicitBassNote: null, effectiveBassRoot: 'C', effectiveChordTypeKey: 'maj7', chordNameDisplay: 'Silencio' };
        }
        const activeCl = noteObj.activeClassObj || (noteObj.classifications && noteObj.classifications[0]);
        const chosenId = techniqueId || state.melodicStudio.selectedHarmonizationByNote[noteObj.globalIdx] || (activeCl && activeCl.defaultOpt) || 'principal_4way';
        const isStandalone = isStandaloneHarmonizationTechnique(chosenId);

        const tRoot = isStandalone ? (noteObj.barChordRoot || 'C') : (noteObj.targetRoot || noteObj.barChordRoot || 'C');
        const tType = isStandalone ? (noteObj.barChordTypeKey || 'maj7') : (noteObj.targetType || noteObj.barChordTypeKey || 'maj7');
        const relLocal = getCoherentChordRelationLabel(noteObj.note.split('/')[0], tRoot, tType);
        const cData = chordStructures[tType] || chordStructures['maj7'];
        const tLead = isStandalone
            ? (cData.voicing_rules[relLocal.label] ? relLocal.label : '3')
            : (noteObj.targetLeadLabel || (cData.voicing_rules[relLocal.label] ? relLocal.label : '3'));

        const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(tRoot) || tRoot.includes('b');
        const allNotes = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const nextPlayable = allNotes.slice(noteObj.globalIdx + 1).find(x => !x.isRest) || noteObj;
        const next2Playable = allNotes.slice(allNotes.indexOf(nextPlayable) + 1).find(x => !x.isRest) || nextPlayable;
        const targetNoteObj = isStandalone
            ? noteObj
            : (chosenId.startsWith('ind_')
                ? (noteObj.analysisTargetNoteObj || nextPlayable)
                : ((noteObj.groupType === 'res_ret_start' || noteObj.groupType === 'dbl_chrom_start') ? next2Playable : nextPlayable));
        const targetTopNote = isStandalone ? noteObj.note : targetNoteObj.note;

        let targetBase = buildCloseVoicingForChordAndLead(tRoot, tType, tLead, targetTopNote);
        if (chosenId.startsWith('ind_')) {
            const targetDisposition = state.melodicStudio.voicingDispositionByNote[noteObj.globalIdx]
                || state.melodicStudio.voicingDisposition
                || 'close';
            if (targetDisposition !== 'close') {
                targetBase = applyDispositionToCloseVoicing(
                    tRoot,
                    tType,
                    tLead,
                    targetBase.labels,
                    targetBase.notesWithOct,
                    targetDisposition
                );
            }
        }
        const targetMidis = targetBase.notesWithOct.map(n => getNoteWithOctaveMidi(n));

        let labels = [...targetBase.labels];
        let notesWithOct = [...targetBase.notesWithOct];
        let effectiveBassRoot = tRoot;
        let effectiveChordTypeKey = tType;
        let chordNameDisplay = displayNote(tRoot) + (cData.cifrado || '');

        if (['ambi_a', 'ambi_b', 'ambi_c'].includes(chosenId)) {
            const ambiBuilt = buildAmbiChordCoherentWithScale(tRoot, tType, noteObj.note, chosenId, noteObj.barScaleId);
            labels = ambiBuilt.labels;
            notesWithOct = ambiBuilt.notesWithOct;
            chordNameDisplay += ` [${HARMONIZATION_TECHNIQUES_CATALOG[chosenId]?.shortName.split(' (')[0]}]`;
        } else if (['principal_var1', 'principal_var2', 'principal_var3'].includes(chosenId)) {
            const varBuilt = build4WayCloseVariantInVoiceOrder(tRoot, tType, tLead, noteObj.note, chosenId);
            notesWithOct = varBuilt.notesWithOct;
            labels = varBuilt.labels;
            chordNameDisplay += ` [Var.${chosenId.slice(-1)}]`;
        } else if (chosenId === 'chromatic_below' || (chosenId === 'double_chrom' && getNoteWithOctaveMidi(targetTopNote) > getNoteWithOctaveMidi(noteObj.note))) {
            const d = getNoteWithOctaveMidi(noteObj.note) - getNoteWithOctaveMidi(targetTopNote);
            effectiveBassRoot = midiToNoteWithOctave(getNoteWithOctaveMidi(tRoot + '/4') + d, preferFlats).split('/')[0];
            notesWithOct = targetMidis.map(m => midiToNoteWithOctave(m + d, preferFlats));
            notesWithOct[0] = noteObj.note;
            labels = targetBase.labels.map((l, idx) => idx === 0 ? l + ' (Voz 1)' : l + ' (Crom.↑)');
            chordNameDisplay = displayNote(effectiveBassRoot) + (cData.cifrado || '') + ' [Crom.↑] ➔ ' + chordNameDisplay;
        } else if (chosenId === 'chromatic_above' || chosenId === 'double_chrom') {
            const d = getNoteWithOctaveMidi(noteObj.note) - getNoteWithOctaveMidi(targetTopNote);
            effectiveBassRoot = midiToNoteWithOctave(getNoteWithOctaveMidi(tRoot + '/4') + d, preferFlats).split('/')[0];
            notesWithOct = targetMidis.map(m => midiToNoteWithOctave(m + d, preferFlats));
            notesWithOct[0] = noteObj.note;
            labels = targetBase.labels.map((l, idx) => idx === 0 ? l + ' (Voz 1)' : l + ' (Crom.↓)');
            chordNameDisplay = displayNote(effectiveBassRoot) + (cData.cifrado || '') + ' [Crom.↓] ➔ ' + chordNameDisplay;
        } else if (chosenId === 'parallel') {
            const move = getNoteWithOctaveMidi(targetTopNote) - getNoteWithOctaveMidi(noteObj.note);
            const d = move < 0 ? 2 : -2;
            effectiveBassRoot = midiToNoteWithOctave(getNoteWithOctaveMidi(tRoot + '/4') + d, preferFlats).split('/')[0];
            notesWithOct = targetMidis.map(m => midiToNoteWithOctave(m + d, preferFlats));
            notesWithOct[0] = noteObj.note;
            labels = targetBase.labels.map((l, idx) => idx === 0 ? l + ' (Voz 1)' : l + ' (Par.)');
            chordNameDisplay = displayNote(effectiveBassRoot) + (cData.cifrado || '') + ' [Paralela] ➔ ' + chordNameDisplay;
        } else if (chosenId === 'dominant' || chosenId.startsWith('tonic_')) {
            const isMinorTarget = tType === 'm7' || tType === 'minor';
            const iiRoot = calculateNoteName(tRoot, { semitones: 2, degreeOffset: 1 });
            const vRoot = calculateNoteName(tRoot, { semitones: 7, degreeOffset: 4 });
            const bIIRoot = calculateNoteName(tRoot, { semitones: 1, degreeOffset: 1 });
            const viiRoot = calculateNoteName(tRoot, { semitones: 11, degreeOffset: 6 });
            const bVIIRoot = calculateNoteName(tRoot, { semitones: 10, degreeOffset: 6 });
            const bVIRoot = calculateNoteName(tRoot, { semitones: 8, degreeOffset: 5 });
            const ivRoot = calculateNoteName(tRoot, { semitones: 5, degreeOffset: 3 });
            const sIVRoot = calculateNoteName(tRoot, { semitones: 6, degreeOffset: 3 });

            let tonRoot = vRoot;
            let tonType = '7';
            if (chosenId === 'tonic_VIIo7_I') { tonRoot = viiRoot; tonType = 'dim7'; }
            else if (chosenId === 'tonic_bII7_I') { tonRoot = bIIRoot; tonType = '7'; }
            else if (chosenId === 'tonic_bVII7_I') { tonRoot = bVIIRoot; tonType = '7'; }
            else if (chosenId === 'tonic_VII7_I') { tonRoot = viiRoot; tonType = '7'; }
            else if (chosenId === 'tonic_II_V_I' || chosenId === 'tonic_II_bII_I') {
                tonRoot = iiRoot;
                tonType = isMinorTarget ? 'm7b5' : 'm7';
            } else if (chosenId === 'tonic_V7ofV_V_I') {
                tonRoot = iiRoot;
                tonType = '7';
            } else if (chosenId === 'tonic_bVI_bII_I') {
                tonRoot = bVIRoot;
                tonType = 'm7';
            } else if (chosenId === 'tonic_IVm_bVII_I') {
                tonRoot = ivRoot;
                tonType = 'm7';
            } else if (chosenId === 'tonic_sIVm7b5_VII7_I') {
                tonRoot = sIVRoot;
                tonType = 'm7b5';
            }
            effectiveBassRoot = tonRoot;
            effectiveChordTypeKey = tonType;
            const tonRel = getCoherentChordRelationLabel(noteObj.note.split('/')[0], tonRoot, tonType);
            const tonRules = chordStructures[tonType]?.voicing_rules || chordStructures['7'].voicing_rules;
            const fallbackLead = tonType === 'dim7' ? '1' : ((isMinorTarget || chosenId === 'tonic_VII7_I') && tonType === '7' ? 'b9' : '9');
            const tonBuilt = buildCloseVoicingForChordAndLead(tonRoot, tonType, tonRules[tonRel.label] ? tonRel.label : fallbackLead, noteObj.note);
            notesWithOct = tonBuilt.notesWithOct;
            labels = tonBuilt.labels;
            chordNameDisplay = `${displayNote(tonRoot)}${chordStructures[tonType]?.cifrado || ''} ➔ ${chordNameDisplay}`;
        } else if (chosenId === 'diminished') {
            const topM = getNoteWithOctaveMidi(noteObj.note);
            const viiRoot = calculateNoteName(tRoot, { semitones: 11, degreeOffset: 6 });
            effectiveBassRoot = viiRoot;
            effectiveChordTypeKey = 'dim7';
            notesWithOct = [noteObj.note, midiToNoteWithOctave(topM - 3, true), midiToNoteWithOctave(topM - 6, true), midiToNoteWithOctave(topM - 9, true)];
            labels = ['1 (º7)', 'b3 (º7)', 'b5 (º7)', '6 (º7)'];
            chordNameDisplay = displayNote(viiRoot) + 'º7 ➔ ' + chordNameDisplay;
        } else if (chosenId === 'diatonic' || chosenId.startsWith('del_')) {
            const isSecondStepOfRR = noteObj.groupType === 'res_ret_end';
            const stepMode = (() => {
                if (chosenId === 'del_cd') return isSecondStepOfRR ? 'diatonic' : 'chromatic';
                if (chosenId === 'del_dc') return isSecondStepOfRR ? 'chromatic' : 'diatonic';
                if (chosenId === 'del_cc') return 'chromatic';
                if (chosenId === 'del_dd') return 'diatonic';
                if (chosenId === 'del_dom_diat') return isSecondStepOfRR ? 'diatonic' : 'dominant';
                if (chosenId === 'del_diat_dom') return isSecondStepOfRR ? 'dominant' : 'diatonic';
                if (chosenId === 'del_dim_diat') return isSecondStepOfRR ? 'diatonic' : 'diminished';
                if (chosenId === 'del_chrom_par') return isSecondStepOfRR ? 'parallel' : 'chromatic';
                if (chosenId === 'del_par_chrom') return isSecondStepOfRR ? 'chromatic' : 'parallel';
                return 'diatonic';
            })();

            if (stepMode === 'chromatic') {
                const move = getNoteWithOctaveMidi(targetTopNote) - getNoteWithOctaveMidi(noteObj.note);
                const d = move >= 0 ? -1 : 1;
                notesWithOct = targetMidis.map(m => midiToNoteWithOctave(m + d, preferFlats));
                notesWithOct[0] = noteObj.note;
                labels = targetBase.labels.map((l, idx) => idx === 0 ? l + ' (Voz 1)' : l + ' (Crom. RR)');
            } else if (stepMode === 'parallel') {
                const move = getNoteWithOctaveMidi(targetTopNote) - getNoteWithOctaveMidi(noteObj.note);
                const d = move >= 0 ? -2 : 2;
                notesWithOct = targetMidis.map(m => midiToNoteWithOctave(m + d, preferFlats));
                notesWithOct[0] = noteObj.note;
                labels = targetBase.labels.map((l, idx) => idx === 0 ? l + ' (Voz 1)' : l + ' (Par. RR)');
            } else if (stepMode === 'dominant') {
                const vRoot = calculateNoteName(tRoot, { semitones: 7, degreeOffset: 4 });
                effectiveBassRoot = vRoot;
                effectiveChordTypeKey = '7';
                const tonRel = getCoherentChordRelationLabel(noteObj.note.split('/')[0], vRoot, '7');
                const domBuilt = buildCloseVoicingForChordAndLead(vRoot, '7', chordStructures['7'].voicing_rules[tonRel.label] ? tonRel.label : '9', noteObj.note);
                notesWithOct = domBuilt.notesWithOct;
                labels = domBuilt.labels;
            } else if (stepMode === 'diminished') {
                const topM = getNoteWithOctaveMidi(noteObj.note);
                const viiRoot = calculateNoteName(tRoot, { semitones: 11, degreeOffset: 6 });
                effectiveBassRoot = viiRoot;
                effectiveChordTypeKey = 'dim7';
                notesWithOct = [noteObj.note, midiToNoteWithOctave(topM - 3, true), midiToNoteWithOctave(topM - 6, true), midiToNoteWithOctave(topM - 9, true)];
                labels = ['1 (º7)', 'b3 (º7)', 'b5 (º7)', '6 (º7)'];
            } else {
                const scale = getChordScaleIntervals(tType, noteObj.barScaleId);
                const innerSpecs = [];
                for (let i = 1; i < 4; i++) {
                    const tName = targetBase.notesWithOct[i].split('/')[0];
                    const tPc = getNoteSemitone(tName);
                    let sIdx = scale.findIndex(s => getNoteSemitone(calculateNoteName(tRoot, s)) === tPc);
                    if (sIdx === -1) sIdx = 0;
                    const neighInt = scale[((sIdx - 1) % scale.length + scale.length) % scale.length];
                    innerSpecs.push({ noteName: calculateNoteName(tRoot, neighInt), label: neighInt.label + ' (Diat.)' });
                }
                const arr = arrangeInnerVoicesInClosePosition(noteObj.note, innerSpecs);
                notesWithOct = arr.notesWithOct;
                labels = [tLead, ...arr.labels];
            }
        } else if (chosenId.startsWith('ind_')) {
            const leadMotion = getNoteWithOctaveMidi(targetTopNote) - getNoteWithOctaveMidi(noteObj.note);
            const expectedMotion = {
                ind_1: 2,
                ind_2: -2,
                ind_3: 1,
                ind_4: -1,
                ind_5: 0,
                ind_6: 0
            }[chosenId];
            const targetScaleId = targetNoteObj.barScaleId;
            if (leadMotion !== expectedMotion
                || !isChordToneOrAvailableTension(targetTopNote.split('/')[0], tRoot, tType, targetScaleId)) {
                throw new Error(`La técnica ${chosenId} requiere que la melodía llegue por el intervalo indicado a una nota del acorde o tensión disponible del objetivo.`);
            }

            const innerVoiceMotion = {
                ind_1: 1,
                ind_2: -1,
                ind_3: -1,
                ind_4: 1,
                ind_5: 1,
                ind_6: -1
            }[chosenId];
            const approachVoices = targetBase.notesWithOct.slice(1).map(targetVoice =>
                midiToNoteWithOctave(getNoteWithOctaveMidi(targetVoice) - innerVoiceMotion, preferFlats)
            );
            const bassTarget = getImplicitBassWithOctave(tRoot, getNoteWithOctaveMidi(targetBase.notesWithOct.at(-1)));
            effectiveBassRoot = midiToNoteWithOctave(
                getNoteWithOctaveMidi(bassTarget) - innerVoiceMotion,
                preferFlats
            ).split('/')[0];
            notesWithOct = [noteObj.note, ...approachVoices];
            labels = targetBase.labels.map((label, idx) => idx === 0
                ? `${label} (LI-${chosenId.slice(-1)})`
                : `${label} (${innerVoiceMotion > 0 ? '↑' : '↓'}½T)`);
            chordNameDisplay = `LI-${chosenId.slice(-1)} ➔ ${targetNoteObj.barChordSymbol}`;
        }

        if (!skipPermutationsAndDrops) {
            const normalizeRole = (r) => (r === 'b3' ? '3' : (r === 'b7' ? '7' : (r === 'b5' ? '5' : r)));
            const activePerms = state.melodicStudio.selectedMultiPermutationsByNote[noteObj.globalIdx] || [];
            if (activePerms.length > 0 && notesWithOct.length >= 4 && !chosenId.startsWith('ind_') && !['ambi_a', 'ambi_b', 'ambi_c'].includes(chosenId)) {
                const usedPcs = new Set([getNoteSemitone(notesWithOct[0].split('/')[0])]);
                const innerSpecs = [];
                for (let i = 1; i < 4; i++) {
                    const rawRole = (labels[i] || '').split(' ')[0];
                    const normRole = normalizeRole(rawRole);
                    const foundPermId = activePerms.find(pid => HARMONIZATION_TECHNIQUES_CATALOG[pid]?.targetRole === normRole);
                    if (foundPermId) {
                        const pObj = HARMONIZATION_TECHNIQUES_CATALOG[foundPermId];
                        const candName = calculateNoteName(effectiveBassRoot, pObj.subInt);
                        const candPc = getNoteSemitone(candName);
                        if (!usedPcs.has(candPc)) {
                            usedPcs.add(candPc);
                            innerSpecs.push({ noteName: candName, label: `${pObj.subInt.label} (x${rawRole})` });
                            continue;
                        }
                    }
                    const origName = notesWithOct[i].split('/')[0];
                    usedPcs.add(getNoteSemitone(origName));
                    innerSpecs.push({ noteName: origName, label: labels[i] });
                }
                const arr = arrangeInnerVoicesInClosePosition(notesWithOct[0], innerSpecs);
                notesWithOct = arr.notesWithOct;
                labels = [labels[0], ...arr.labels];
            }

            // Aplicar disposición individual de la nota (o global) a cualquier técnica (4-Way Close, Lead Independiente, Resolución Retardada, Tonicización, etc.)
            const disp = state.melodicStudio.voicingDispositionByNote[noteObj.globalIdx] || state.melodicStudio.voicingDisposition || 'close';
            if (disp !== 'close' && !chosenId.startsWith('ind_') && !['ambi_a', 'ambi_b', 'ambi_c'].includes(chosenId)) {
                const dispBuilt = applyDispositionToCloseVoicing(effectiveBassRoot, effectiveChordTypeKey, tLead, labels, notesWithOct, disp);
                notesWithOct = dispBuilt.notesWithOct;
                labels = dispBuilt.labels;
            }
        }

        const activeDisp = state.melodicStudio.voicingDispositionByNote[noteObj.globalIdx] || state.melodicStudio.voicingDisposition || 'close';
        const checked = chosenId.startsWith('ind_')
            ? { notesWithOct, labels }
            : enforceNoMinorSecondAtTop(notesWithOct, labels, effectiveBassRoot);
        notesWithOct = checked.notesWithOct;
        labels = checked.labels;
        const lowMidi = Math.min(...notesWithOct.map(n => getNoteWithOctaveMidi(n)));
        return {
            techniqueId: chosenId,
            dispositionId: activeDisp,
            labels,
            notesWithOct,
            implicitBassNote: getImplicitBassWithOctave(effectiveBassRoot, lowMidi),
            effectiveBassRoot,
            effectiveChordTypeKey,
            chordNameDisplay
        };
    }

    const DISPOSITION_HUMAN_NAMES = {
        close: '4-Way Close (Posición Cerrada)',
        close_var1: '4-Way Close Variante 1',
        close_var2: '4-Way Close Variante 2',
        close_var3: '4-Way Close Variante 3',
        shearing: 'Double Lead (5ª Voz 8vb)',
        double_lead: 'Double Lead (5ª Voz 8vb)',
        ambi_a: 'Ambi Chord Modelo A',
        ambi_b: 'Ambi Chord Modelo B',
        ambi_c: 'Ambi Chord Modelo C',
        drop2: 'Drop 2 (Abierto)',
        drop3: 'Drop 3 (Abierto)',
        drop24: 'Drop 2 & 4 (Abierto)',
        spread4: 'Spread a 4 Voces',
        spread5_m1: 'Spread 5 Voces (Método 1)',
        drop2_spread5: 'Spread 5 Voces (Método 2 • Drop 2)',
        quasi_spread5: 'Quasi Spread 5 Voces (Método 3)'
    };

    function updateStudioLivePlaybackBanner(noteObj, compObj, isPlaying = false) {
        const dot = el('studioLivePlayStatusDot');
        const chordTxt = el('studioLivePlayChordText');
        const techBadge = el('studioLivePlayTechBadge');
        const dispBadge = el('studioLivePlayDispBadge');
        if (!chordTxt || !techBadge || !dispBadge) return;
        if (!noteObj || noteObj.isRest) {
            if (dot) dot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-slate-400';
            chordTxt.textContent = isPlaying ? '𝄽 Reproduciendo silencio...' : '🎼 Partitura Activa: Selecciona cualquier nota o pulsa Play';
            techBadge.textContent = 'Técnica: --';
            dispBadge.textContent = '📐 Disposición: 4-Way Close (Cerrada)';
            return;
        }
        const tId = compObj?.techniqueId || state.melodicStudio.selectedHarmonizationByNote[noteObj.globalIdx] || 'principal_4way';
        const tObj = HARMONIZATION_TECHNIQUES_CATALOG[tId] || HARMONIZATION_TECHNIQUES_CATALOG['principal_4way'];
        const dispId = ['ambi_a', 'ambi_b', 'ambi_c'].includes(tId)
            ? tId
            : (compObj?.dispositionId || state.melodicStudio.voicingDispositionByNote[noteObj.globalIdx] || 'close');
        const dispName = DISPOSITION_HUMAN_NAMES[dispId] || dispId;
        if (dot) {
            dot.className = 'inline-block w-2.5 h-2.5 rounded-full ' + (isPlaying ? 'bg-amber-400 animate-ping' : 'bg-emerald-400');
        }
        chordTxt.innerHTML = `${isPlaying ? '🔊 <strong>SONANDO AHORA:</strong>' : '🎯 <strong>ACORDE SELECCIONADO:</strong>'} Compás ${noteObj.bar} (${compObj?.chordNameDisplay || noteObj.barChordSymbol}) • Melodía: <strong>${formatScientificPitch(noteObj.note)}</strong>`;
        techBadge.textContent = `Técnica: [${tObj.abbr}] ${tObj.shortName.split(' (')[0]}`;
        dispBadge.textContent = `📐 Disposición: ${dispName}`;
    }

    // Puntos 2 y 5: Partitura del Estudio en Gran Pentagrama (Sol + Fa, notas < C4 en Fa) y Acordes estilo Lead Sheet
    function drawMelodicPhraseScore(activeNoteGlobalIdx = -1) {
        try {
            const canvas = el('melodicPhraseCanvas');
            const VF = window.Vex ? window.Vex.Flow : null;
            if (!canvas || !VF || !VF.Renderer) return;
            const { Renderer, Stave, StaveNote, GhostNote, Voice, Formatter, Accidental, Beam, StaveConnector } = VF;

            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const measures = ex.measures;
            const isMobile = window.innerWidth < 768;
            const measuresPerRow = isMobile ? 1 : (state.melodicStudio.measuresPerRowMode === 4 ? 4 : 2);
            const numRows = Math.ceil(measures.length / measuresPerRow);
            const width = isMobile ? 740 : (measuresPerRow === 4 ? 1560 : 1280);
            const rowHeight = 439;
            const height = numRows * rowHeight + 30;

            canvas.dataset.logicalWidth = String(width);
            canvas.dataset.logicalHeight = String(height);

            const scoreScrollWrap = el('melodicScoreScrollContainer');
            const zoomInner = el('melodicScoreZoomInner');
            const availableWidth = Math.max(1, (scoreScrollWrap?.clientWidth || width) - 16);
            const displayWidth = isMobile
                ? Math.max(availableWidth, width * (state.melodicStudio.scoreZoomPercent / 100))
                : availableWidth * (state.melodicStudio.scoreZoomPercent / 100);
            if (zoomInner) zoomInner.style.width = `${displayWidth}px`;
            const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
            renderer.resize(width, height);
            canvas.style.width = '100%';
            canvas.style.height = 'auto';

            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.fillStyle = '#0f172a';
            context.strokeStyle = '#0f172a';

            const ctx = renderer.getContext();
            state.melodicStudio.noteHitBoxes = [];
            const flatNotes = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            let cursorGlobal = 0;

            // Sombreado exclusivo para conjuntos de 2, 3 o más armonizaciones hacia el acorde objetivo
            const isPlaybackActive = state.melodicStudio.isPlayingPhrase || activeNoteGlobalIdx >= 0;
            const selIdxForGroup = isPlaybackActive ? -1 : state.melodicStudio.selectedNoteIdx;
            let activeGroupSet = new Set();
            if (selIdxForGroup !== null && selIdxForGroup >= 0 && flatNotes[selIdxForGroup] && !flatNotes[selIdxForGroup].isRest) {
                const selNoteObj = flatNotes[selIdxForGroup];
                const selTechId = state.melodicStudio.selectedHarmonizationByNote[selIdxForGroup] || selNoteObj.activeClassObj?.defaultOpt || 'principal_4way';
                const grpList = getGroupIndicesForHarmonization(selNoteObj, selTechId, flatNotes);
                if (grpList.length >= 2) {
                    activeGroupSet = new Set(grpList);
                }
            }

            for (let mIdx = 0; mIdx < measures.length; mIdx++) {
                const m = measures[mIdx];
                const row = Math.floor(mIdx / measuresPerRow);
                const col = mIdx % measuresPerRow;
                const staveW = Math.floor((width - 44) / measuresPerRow);
                const x = 22 + col * staveW;
                const yTreble = row * rowHeight + 90;
                const yBass = yTreble + 102;
                const timeSigStr = m.timeSignature || ex.timeSignature || "4/4";
                const [tsNum, tsDen] = timeSigStr.split('/').map(n => parseInt(n, 10) || 4);

                const trebleStave = new Stave(x, yTreble, staveW);
                const bassStave = new Stave(x, yBass, staveW);
                if (col === 0) {
                    trebleStave.addClef("treble");
                    bassStave.addClef("bass");
                }
                if (mIdx === 0) {
                    trebleStave.addTimeSignature(timeSigStr);
                    bassStave.addTimeSignature(timeSigStr);
                }
                trebleStave.setContext(ctx).draw();
                bassStave.setContext(ctx).draw();

                if (StaveConnector) {
                    if (col === 0) {
                        new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
                        new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
                    }
                    new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
                }

                // Punto 2: Número de compás discreto sin solapar acordes
                context.save();
                context.font = '800 10px "JetBrains Mono", monospace';
                context.fillStyle = '#475569';
                context.fillText('[' + m.bar + ']', x + 2, yTreble - 78);
                context.restore();

                // Control de alteraciones dentro del compás para colocar becuadro (♮) cuando una nota # o b pasa a natural (ej. D# ➔ D♮)
                const activeAccidentalsInBar = Object.create(null);
                const trebleNotes = [];
                const bassNotes = [];
                const barNotesMeta = [];
                const tBeams = [];
                const tupletsToDraw = [];
                const tupletCanvasGroups = [];
                let curBeam = [];
                let curTupletGroup = [];
                let curTupletMetaGroup = [];
                let beatCursor = 0;

                const applyDotsToAllKeys = (staveNoteObj, keysCount) => {
                    if (!staveNoteObj || !VF.Dot) return;
                    for (let k = 0; k < keysCount; k++) {
                        try {
                            staveNoteObj.addModifier(new VF.Dot(), k);
                        } catch (e) {}
                    }
                };

                for (let nIdx = 0; nIdx < m.notes.length; nIdx++) {
                    const fn = flatNotes[cursorGlobal];
                    const isSel = cursorGlobal === state.melodicStudio.selectedNoteIdx;
                    const isPlay = cursorGlobal === activeNoteGlobalIdx;
                    const isGroupCompanion = activeGroupSet.size >= 2 && activeGroupSet.has(cursorGlobal) && !isSel && !isPlay;
                    const colMain = isPlay ? '#dc2626' : (isSel ? '#1d4ed8' : (isGroupCompanion ? '#b45309' : '#0f172a'));
                    let tSn = null, bSn = null, tReal = false;

                    const isTuplet = fn.dur.endsWith('t');
                    const isDotted = fn.dur.endsWith('d');
                    const vfDur = isTuplet ? fn.dur.replace('t', '') : (isDotted ? fn.dur.replace('d', '') : fn.dur);
                    const durForSn = isDotted ? (vfDur + 'd') : vfDur;

                    if (fn.isRest) {
                        tSn = new StaveNote({ keys: ["b/4"], duration: durForSn + "r", clef: "treble" });
                        bSn = GhostNote ? new GhostNote({ duration: durForSn }) : new StaveNote({ keys: ["d/3"], duration: durForSn + "r", clef: "bass" });
                        if (isDotted) {
                            applyDotsToAllKeys(tSn, 1);
                        }
                    } else {
                        const comp = state.melodicStudio.autoFilledPhraseVoicings[cursorGlobal];
                        const showChord = state.melodicStudio.showFullVoicingInScore && comp && comp.notesWithOct && comp.notesWithOct.length;
                        const rawKeys = showChord ? [...comp.notesWithOct] : [fn.note];
                        const sortedKeys = [...rawKeys].sort((a, b) => getNoteWithOctaveMidi(a) - getNoteWithOctaveMidi(b));
                        const tKeys = sortedKeys.filter(k => getNoteWithOctaveMidi(k) >= 60);
                        const bKeys = sortedKeys.filter(k => getNoteWithOctaveMidi(k) < 60);

                        const applyMeasureAccidentalWithNatural = (staveNoteObj, keysList) => {
                            keysList.forEach((kStr, kIdx) => {
                                const [np] = kStr.split('/');
                                const acc = np.substring(1); // '', '#', 'b', '##', 'bb'
                                if (shouldShowMeasureAccidental(activeAccidentalsInBar, kStr)) {
                                    const vfAccSymbol = acc === '' ? 'n' : acc;
                                    staveNoteObj.addModifier(new Accidental(vfAccSymbol), kIdx);
                                }
                                staveNoteObj.setKeyStyle(kIdx, { fillStyle: colMain, strokeStyle: colMain });
                            });
                        };

                        if (tKeys.length > 0) {
                            tSn = new StaveNote({ keys: tKeys, duration: durForSn, clef: "treble", stem_direction: 1, auto_stem: false });
                            applyMeasureAccidentalWithNatural(tSn, tKeys);
                            if (isDotted) {
                                applyDotsToAllKeys(tSn, tKeys.length);
                            }
                            tReal = true;
                        } else {
                            tSn = GhostNote ? new GhostNote({ duration: durForSn }) : new StaveNote({ keys: ["b/4"], duration: durForSn + "r", clef: "treble" });
                        }

                        if (bKeys.length > 0) {
                            bSn = new StaveNote({ keys: bKeys, duration: durForSn, clef: "bass", stem_direction: -1, auto_stem: false });
                            applyMeasureAccidentalWithNatural(bSn, bKeys);
                            if (isDotted) {
                                applyDotsToAllKeys(bSn, bKeys.length);
                            }
                        } else {
                            bSn = GhostNote ? new GhostNote({ duration: durForSn }) : new StaveNote({ keys: ["d/3"], duration: durForSn + "r", clef: "bass" });
                        }
                    }

                    if (isTuplet) {
                        const tupletNote = tReal ? tSn : bSn;
                        curTupletGroup.push(tupletNote);
                        curTupletMetaGroup.push({ sn: tupletNote, fn, tReal, tSn, bSn });
                        if (curTupletGroup.length === 3) {
                            if (VF.Tuplet) {
                                try {
                                    tupletsToDraw.push(new VF.Tuplet(curTupletGroup, {
                                        num_notes: 3,
                                        notes_occupied: 2,
                                        location: VF.Tuplet.LOCATION_TOP,
                                        bracketed: true,
                                        ratioed: false
                                    }));
                                } catch (e) {}
                            }
                            tupletCanvasGroups.push([...curTupletMetaGroup]);
                            curTupletGroup = [];
                            curTupletMetaGroup = [];
                        }
                    } else {
                        if (curTupletMetaGroup.length > 0) {
                            tupletCanvasGroups.push([...curTupletMetaGroup]);
                        }
                        curTupletGroup = [];
                        curTupletMetaGroup = [];
                    }

                    const startBeatOfNote = beatCursor;
                    const bVal = getBeatsForDuration(fn.dur);
                    if (!fn.isRest && tReal && (vfDur === '8' || vfDur === '16')) {
                        curBeam.push(tSn);
                        const nextB = beatCursor + bVal;
                        const isTupletEnd = isTuplet && curTupletGroup.length === 0;
                        if (isTupletEnd || Math.abs(nextB - Math.round(nextB)) < 0.001 || nIdx === m.notes.length - 1) {
                            if (curBeam.length > 1) tBeams.push(new Beam(curBeam));
                            curBeam = [];
                        }
                    } else {
                        if (curBeam.length > 1) tBeams.push(new Beam(curBeam));
                        curBeam = [];
                    }
                    beatCursor += bVal;

                    trebleNotes.push(tSn);
                    bassNotes.push(bSn);
                    const melodyStaveNote = !fn.isRest && getNoteWithOctaveMidi(fn.note) < 60 ? bSn : tSn;
                    barNotesMeta.push({ fn, sn: tSn, melodyStaveNote, globalIdx: cursorGlobal, startBeatOfNote });
                    cursorGlobal++;
                }

                if (curTupletMetaGroup.length > 0) {
                    tupletCanvasGroups.push([...curTupletMetaGroup]);
                    curTupletGroup = [];
                    curTupletMetaGroup = [];
                }

                const vTreble = new Voice({ num_beats: tsNum, beat_value: tsDen }).setStrict(false).addTickables(trebleNotes);
                const vBass = new Voice({ num_beats: tsNum, beat_value: tsDen }).setStrict(false).addTickables(bassNotes);
                const formatWidth = Math.max(210, staveW - (col === 0 ? 100 : 52));
                new Formatter().joinVoices([vTreble, vBass]).format([vTreble, vBass], formatWidth);
                vTreble.draw(ctx, trebleStave);
                vBass.draw(ctx, bassStave);
                tBeams.forEach(b => b.setContext(ctx).draw());

                // Líneas guía de enlace de voces (Voice Leading)
                if (state.melodicStudio.showVoiceLeadingLines && barNotesMeta.length > 1) {
                    context.save();
                    context.setLineDash([3, 3]);
                    for (let i = 0; i < barNotesMeta.length - 1; i++) {
                        const m1 = barNotesMeta[i], m2 = barNotesMeta[i + 1];
                        if (m1.sn && m2.sn && !m1.fn.isRest && !m2.fn.isRest) {
                            const x1 = m1.sn.getAbsoluteX() + 6;
                            const x2 = m2.sn.getAbsoluteX() + 6;
                            const y1 = (m1.melodyStaveNote.getYs && m1.melodyStaveNote.getYs()[0]) || (yTreble + 40);
                            const y2 = (m2.melodyStaveNote.getYs && m2.melodyStaveNote.getYs()[0]) || (yTreble + 40);
                            context.strokeStyle = 'rgba(6, 182, 212, 0.55)';
                            context.lineWidth = 1.6;
                            context.beginPath();
                            context.moveTo(x1, y1);
                            context.bezierCurveTo(x1 + (x2 - x1) * 0.4, y1 - 10, x1 + (x2 - x1) * 0.6, y2 - 10, x2, y2);
                            context.stroke();
                        }
                    }
                    context.restore();
                }

                // Punto 2: Dibujar los cifrados estilo Lead Sheet sobre sus tiempos exactos (T1 y T3)
                const hrList = (Array.isArray(m.harmonicRhythm) && m.harmonicRhythm.length)
                    ? m.harmonicRhythm
                    : [{ root: m.chordRoot, type: m.chordTypeKey, startBeat: 0, durationBeats: 4 }];
                const chordLabelRightEdges = [-Infinity, -Infinity];
                hrList.forEach((seg, sIdx) => {
                    const segSym = displayNote(seg.root) + (chordStructures[seg.type]?.cifrado || '');
                    let chordX = x + (col === 0 ? 58 : 20);
                    if (sIdx > 0) {
                        const noteAtBeat = barNotesMeta.find(meta => meta.startBeatOfNote >= seg.startBeat - 0.05);
                        chordX = noteAtBeat ? noteAtBeat.sn.getAbsoluteX() - 4 : (x + Math.floor(staveW * 0.54));
                    } else if (barNotesMeta[0]) {
                        chordX = Math.max(chordX, barNotesMeta[0].sn.getAbsoluteX() - 4);
                    }
                    const scInfo = inferContextualScaleAndFunction(seg.root, seg.type, null, null, seg.scaleId || m.scaleId);
                    context.save();
                    context.font = '800 16px "Plus Jakarta Sans", Georgia, serif';
                    const chordWidth = context.measureText(segSym).width;
                    context.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
                    const scaleName = scInfo.name.split(' (')[0];
                    const scaleWidth = context.measureText(scaleName).width;
                    const labelWidth = Math.max(chordWidth, scaleWidth);
                    chordX = Math.max(x + (col === 0 ? 58 : 20), chordX);
                    chordX = Math.min(chordX, x + staveW - labelWidth - 8);
                    let chordLane = chordLabelRightEdges.findIndex(rightEdge => chordX >= rightEdge + 6);
                    if (chordLane < 0) chordLane = sIdx % chordLabelRightEdges.length;
                    chordLabelRightEdges[chordLane] = chordX + labelWidth;

                    context.font = '800 16px "Plus Jakarta Sans", Georgia, serif';
                    context.fillStyle = '#0f172a';
                    context.fillText(segSym, chordX, yTreble - 68 - chordLane * 34);
                    context.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
                    context.fillStyle = '#0d9488';
                    context.fillText(scaleName, chordX, yTreble - 51 - chordLane * 34);
                    context.restore();
                });

                // Control de espaciado horizontal por niveles para que las etiquetas de análisis NUNCA se solapen
                const rowRightEdgeX = [-999];
                const analysisRightEdgeX = [-999, -999, -999, -999];
                const harmonizationGroups = new Map();
                const groupedNotes = new Set();
                barNotesMeta.forEach(meta => {
                    if (meta.fn.isRest || groupedNotes.has(meta.globalIdx)) return;
                    const comp = state.melodicStudio.autoFilledPhraseVoicings[meta.globalIdx];
                    const techId = comp?.techniqueId || state.melodicStudio.selectedHarmonizationByNote[meta.globalIdx] || meta.fn.activeClassObj?.defaultOpt || 'principal_4way';
                    const groupType = meta.fn.groupType;
                    const isGroupStart = (groupType === 'res_ret_start' && meta.fn.analysisRetardationValid)
                        || (groupType === 'dbl_chrom_start' && meta.fn.analysisDoubleChromaticValid)
                        || techId.startsWith('del_')
                        || (techId === 'double_chrom' && meta.fn.analysisDoubleChromaticValid)
                        || techId.startsWith('ind_') || techId.startsWith('tonic_');
                    if (!isGroupStart) return;

                    const indices = getGroupIndicesForHarmonization(meta.fn, techId, flatNotes);
                    if (indices.length < 2 || indices[0] !== meta.globalIdx) return;
                    const members = indices.map(idx => barNotesMeta.find(candidate => candidate.globalIdx === idx));
                    if (members.some(member => !member)) return;

                    let label = `[ ${HARMONIZATION_TECHNIQUES_CATALOG[techId]?.abbr || techId} ]`;
                    let color = '#b91c1c';
                    let background = '#fee2e2';
                    if (groupType === 'dbl_chrom_start' || techId === 'double_chrom') {
                        label = '[ Doble cromático ]';
                        color = '#5b21b6';
                        background = '#ede9fe';
                    } else if (techId.startsWith('tonic_')) {
                        label = '[ TONICIZACIÓN ]';
                        color = '#be185d';
                        background = '#fce7f3';
                    } else if (techId.startsWith('ind_')) {
                        label = `[ LEAD INDEP. ${techId.replace('ind_', '#')} ]`;
                        color = '#047857';
                        background = '#d1fae5';
                    }

                    const group = { techId, indices, members, label, color, background };
                    indices.forEach(idx => groupedNotes.add(idx));
                    harmonizationGroups.set(meta.globalIdx, group);
                });

                barNotesMeta.forEach((meta, idxInBar) => {
                    const nx = meta.sn.getAbsoluteX();
                    const isPrimaryActive = meta.globalIdx === selIdxForGroup;
                    const isInMultiGroup = activeGroupSet.size >= 2 && activeGroupSet.has(meta.globalIdx);

                    if (isInMultiGroup) {
                        context.save();
                        if (isPrimaryActive) {
                            // Color diferente y destacado para el acorde seleccionado dentro del conjunto
                            context.fillStyle = 'rgba(29, 78, 216, 0.18)';
                            context.strokeStyle = '#1d4ed8';
                            context.lineWidth = 2.4;
                            context.fillRect(nx - 8, yTreble - 10, 34, 218);
                            context.strokeRect(nx - 8, yTreble - 10, 34, 218);
                            context.fillStyle = '#1d4ed8';
                            context.fillRect(nx - 8, yTreble - 23, 46, 12);
                            context.font = '800 8px "Plus Jakarta Sans", sans-serif';
                            context.fillStyle = '#ffffff';
                            context.fillText('ACTIVO', nx - 5, yTreble - 14);
                        } else {
                            // Sombreado ámbar para el resto de notas que integran el conjunto armónico
                            context.fillStyle = 'rgba(245, 158, 11, 0.17)';
                            context.strokeStyle = '#d97706';
                            context.lineWidth = 1.6;
                            context.fillRect(nx - 7, yTreble - 8, 32, 215);
                            context.strokeRect(nx - 7, yTreble - 8, 32, 215);
                        }
                        context.restore();
                    } else if (isPrimaryActive) {
                        context.save();
                        context.fillStyle = 'rgba(37, 99, 235, 0.12)';
                        context.strokeStyle = '#2563eb';
                        context.lineWidth = 2;
                        context.fillRect(nx - 6, yTreble - 8, 30, 215);
                        context.strokeRect(nx - 6, yTreble - 8, 30, 215);
                        context.restore();
                    }

                    const cl = meta.fn.activeClassObj || meta.fn.classifications[0];
                    const compObj = state.melodicStudio.autoFilledPhraseVoicings[meta.globalIdx];
                    const tId = compObj?.techniqueId || state.melodicStudio.selectedHarmonizationByNote[meta.globalIdx] || cl.defaultOpt || 'principal_4way';
                    const dispId = ['ambi_a', 'ambi_b', 'ambi_c'].includes(tId)
                        ? tId
                        : (compObj?.dispositionId || state.melodicStudio.voicingDispositionByNote[meta.globalIdx] || 'close');
                    const annotationMode = state.melodicStudio.scoreAnnotationMode;
                    const showAnalysisAnnotation = annotationMode === 'analysis' || annotationMode === 'both';
                    const showHarmonizationAnnotation = annotationMode === 'harmonization' || annotationMode === 'both';

                    // Cabezal y cursor de reproducción luminoso en tiempo real
                    if (isPlaybackActive && meta.globalIdx === activeNoteGlobalIdx) {
                        context.save();
                        context.fillStyle = 'rgba(239, 68, 68, 0.18)';
                        context.strokeStyle = '#ef4444';
                        context.lineWidth = 2.4;
                        context.fillRect(nx - 8, yTreble - 16, 36, 230);
                        context.strokeRect(nx - 8, yTreble - 16, 36, 230);
                        context.fillStyle = '#ef4444';
                        context.beginPath();
                        context.moveTo(nx + 10, yTreble - 8);
                        context.lineTo(nx + 18, yTreble - 20);
                        context.lineTo(nx + 2, yTreble - 20);
                        context.closePath();
                        context.fill();
                        context.restore();
                    }

                    // Mostrar etiqueta flotante sobre el acorde en reproducción indicando su disposición
                    if (isPlaybackActive && meta.globalIdx === activeNoteGlobalIdx && !meta.fn.isRest) {
                        const dispShort = DISPOSITION_HUMAN_NAMES[dispId] || dispId;
                        context.save();
                        context.fillStyle = '#0f172a';
                        context.strokeStyle = '#f59e0b';
                        context.lineWidth = 2.6;
                        context.fillStyle = 'rgba(245, 158, 11, 0.24)';
                        context.fillRect(nx - 8, yTreble - 10, 36, 218);
                        context.strokeRect(nx - 8, yTreble - 10, 36, 218);
                        context.fillStyle = '#0f172a';
                        context.strokeStyle = '#f59e0b';
                        context.lineWidth = 1.6;
                        const bw = Math.max(130, dispShort.length * 5.8 + 16);
                        const bx = Math.min(width - bw - 8, Math.max(8, nx - 14));
                        context.fillRect(bx, yTreble - 40, bw, 18);
                        context.strokeRect(bx, yTreble - 40, bw, 18);
                        context.font = '800 10px "Plus Jakarta Sans", sans-serif';
                        context.fillStyle = '#fde047';
                        context.fillText(`🔊 ${dispShort}`, bx + 6, yTreble - 28);
                        context.restore();
                    }

                    if (showAnalysisAnnotation) {
                        const analysisLabel = meta.fn.isRest
                            ? '𝄽'
                            : getMelodicAnalysisNotation(meta.fn, cl, state.melodicStudio.approachNotation);
                        context.save();
                        context.font = '800 9.5px "JetBrains Mono", monospace';
                        const analysisTextW = context.measureText(analysisLabel).width + 8;
                        const analysisLabelX = nx - 6;
                        let analysisLane = 0;
                        for (let lane = 0; lane < analysisRightEdgeX.length; lane++) {
                            if (analysisLabelX >= analysisRightEdgeX[lane] + 8) {
                                analysisLane = lane;
                                break;
                            }
                            if (lane === analysisRightEdgeX.length - 1) analysisLane = idxInBar % analysisRightEdgeX.length;
                        }
                        analysisRightEdgeX[analysisLane] = analysisLabelX + analysisTextW;
                        const stemExtents = meta.melodyStaveNote?.getStemExtents?.();
                        const stemTopY = stemExtents
                            ? Math.min(stemExtents.topY, stemExtents.baseY)
                            : yTreble + 20;
                        const analysisLabelY = stemTopY - 6 - analysisLane * 13;
                        meta.badgeTopY = analysisLabelY - 9;
                        const analysisColors = meta.fn.isRest
                            ? { text: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' }
                            : (meta.fn.isMainMelodicNote || cl.pOrS === 'P'
                                ? { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' }
                                : (meta.fn.analysisDiatonicToScale
                                    ? { text: '#065f46', bg: '#d1fae5', border: '#6ee7b7' }
                                    : { text: '#92400e', bg: '#fef3c7', border: '#fcd34d' }));
                        context.fillStyle = analysisColors.bg;
                        context.strokeStyle = analysisColors.border;
                        context.lineWidth = 1;
                        context.fillRect(analysisLabelX, analysisLabelY - 9, analysisTextW, 13);
                        context.strokeRect(analysisLabelX, analysisLabelY - 9, analysisTextW, 13);
                        context.fillStyle = analysisColors.text;
                        context.fillText(analysisLabel, analysisLabelX + 4, analysisLabelY + 1);
                        context.restore();
                    } else {
                        const stemExtents = meta.melodyStaveNote?.getStemExtents?.();
                        meta.badgeTopY = stemExtents
                            ? Math.min(stemExtents.topY, stemExtents.baseY)
                            : yTreble + 20;
                    }

                    // La etiqueta inferior identifica la técnica y disposición usadas para armonizar
                    const techAbbr = HARMONIZATION_TECHNIQUES_CATALOG[tId]?.abbr || '4-WC';
                    const dispAbbrMap = { shearing: '5ªV', double_lead: '5ªV', drop2: 'D2', drop3: 'D3', drop24: 'D24', spread4: 'Sp4', spread5_m1: 'Sp5M1', drop2_spread5: 'Sp5M2', quasi_spread5: 'QSp5' };
                    const dispSuffix = (dispId && dispId !== 'close' && dispAbbrMap[dispId]) ? `·${dispAbbrMap[dispId]}` : '';
                    const techniqueTag = meta.fn.isRest ? '𝄽' : `${techAbbr}${dispSuffix}`;

                    const harmonyGroup = harmonizationGroups.get(meta.globalIdx);
                    const isGroupedNote = groupedNotes.has(meta.globalIdx);
                    if (showHarmonizationAnnotation && !isGroupedNote) {
                        context.save();
                        context.font = '800 9.5px "JetBrains Mono", monospace';
                        const textW = context.measureText(techniqueTag).width + 8;
                        const labelX = Math.max(nx - 6, rowRightEdgeX[0] + 4);

                        // Asignar fila vertical sin colisión horizontal
                        let chosenLane = 0;
                        for (let lane = 0; lane < 1; lane++) {
                            if (labelX >= rowRightEdgeX[lane] + 18) {
                                chosenLane = lane;
                                break;
                            }
                            if (lane === 3) chosenLane = idxInBar % 4;
                        }
                        rowRightEdgeX[chosenLane] = labelX + textW;
                        const labelY = yBass + 112;

                        // Colores fuertes y diferenciados para Lead Independiente vs Tonicización vs Estándar
                        let tagTextColor = '#1e40af';
                        let tagBgColor = '#eff6ff';
                        let tagBorderColor = '#93c5fd';
                        if (meta.fn.isRest) {
                            tagTextColor = '#64748b'; tagBgColor = '#f1f5f9'; tagBorderColor = '#cbd5e1';
                        } else if (tId.startsWith('ind_')) {
                            // Lead Independiente: Verde Esmeralda Fuerte
                            tagTextColor = '#065f46'; tagBgColor = '#a7f3d0'; tagBorderColor = '#059669';
                        } else if (tId.startsWith('tonic_')) {
                            // Tonicización: Fucsia / Magenta Fuerte
                            tagTextColor = '#9d174d'; tagBgColor = '#fbcfe8'; tagBorderColor = '#db2777';
                        } else if (tId.startsWith('del_') || meta.fn.groupType?.startsWith('res_ret')) {
                            tagTextColor = '#991b1b'; tagBgColor = '#fee2e2'; tagBorderColor = '#dc2626';
                        } else if (cl.pOrS !== 'P') {
                            tagTextColor = '#92400e'; tagBgColor = '#fef3c7'; tagBorderColor = '#f59e0b';
                        }

                        if (chosenLane > 0) {
                            context.strokeStyle = tagBorderColor;
                            context.lineWidth = 1;
                            context.beginPath();
                            context.moveTo(nx + 4, yBass + 74);
                            context.lineTo(nx + 4, labelY - 9);
                            context.stroke();
                        }

                        context.fillStyle = tagBgColor;
                        context.strokeStyle = tagBorderColor;
                        context.lineWidth = 1.2;
                        context.fillRect(labelX, labelY - 9, textW, 13);
                        context.strokeRect(labelX, labelY - 9, textW, 13);
                        context.fillStyle = tagTextColor;
                        context.fillText(techniqueTag, labelX + 4, labelY + 1);
                        context.restore();
                    }

                    if (showHarmonizationAnnotation && harmonyGroup) {
                        const groupStartX = nx - 4;
                        const groupEndX = harmonyGroup.members[harmonyGroup.members.length - 1].sn.getAbsoluteX() + 18;
                        context.save();
                        context.font = '800 9.5px "Plus Jakarta Sans", sans-serif';
                        const labelWidth = context.measureText(harmonyGroup.label).width + 8;
                        const labelX = (groupStartX + groupEndX - labelWidth) / 2;
                        let chosenLane = 0;
                        for (let lane = 0; lane < rowRightEdgeX.length; lane++) {
                            if (labelX >= rowRightEdgeX[lane] + 12) {
                                chosenLane = lane;
                                break;
                            }
                            if (lane === rowRightEdgeX.length - 1) chosenLane = idxInBar % rowRightEdgeX.length;
                        }
                        rowRightEdgeX[chosenLane] = Math.max(groupEndX, labelX + labelWidth);
                        const labelY = yBass + 112;
                        const bracketY = labelY - 12;
                        context.strokeStyle = harmonyGroup.color;
                        context.lineWidth = 2;
                        context.beginPath();
                        context.moveTo(groupStartX, bracketY - 5);
                        context.lineTo(groupStartX, bracketY);
                        context.lineTo(groupEndX, bracketY);
                        context.lineTo(groupEndX, bracketY - 5);
                        context.stroke();
                        context.fillStyle = harmonyGroup.background;
                        context.fillRect(labelX, labelY - 9, labelWidth, 13);
                        context.strokeRect(labelX, labelY - 9, labelWidth, 13);
                        context.fillStyle = harmonyGroup.color;
                        context.fillText(harmonyGroup.label, labelX + 4, labelY + 1);
                        context.restore();
                    }

                    state.melodicStudio.noteHitBoxes.push({ globalIdx: meta.globalIdx, x: nx - 10, y: yTreble - 10, w: 36, h: 225 });
                });

                // Renderizado visible, limpio y garantizado del corchete con símbolo 3 para los tresillos (sin solapes con insignias de análisis)
                tupletCanvasGroups.forEach(grp => {
                    if (!grp || !grp.length) return;
                    const firstSn = grp[0].sn;
                    const lastSn = grp[grp.length - 1].sn;
                    if (!firstSn || !lastSn) return;
                    const x1 = (typeof firstSn.getAbsoluteX === 'function') ? firstSn.getAbsoluteX() - 4 : (x + 20);
                    const x2 = (typeof lastSn.getAbsoluteX === 'function') ? lastSn.getAbsoluteX() + 14 : (x1 + 35);

                    let minObstacleY = yTreble + 15;
                    grp.forEach(it => {
                        const noteObj = it.sn;
                        if (noteObj && typeof noteObj.getYs === 'function') {
                            const ys = noteObj.getYs();
                            if (ys && ys.length) minObstacleY = Math.min(minObstacleY, ...ys);
                        }
                        if (noteObj && typeof noteObj.getStemExtents === 'function') {
                            const ext = noteObj.getStemExtents();
                            if (ext && ext.topY !== undefined) minObstacleY = Math.min(minObstacleY, ext.topY);
                        }
                        const meta = barNotesMeta.find(m => m.sn === it.sn || m.fn === it.fn);
                        if (meta && typeof meta.badgeTopY === 'number') {
                            minObstacleY = Math.min(minObstacleY, meta.badgeTopY);
                        }
                    });

                    // Colocar el corchete con holgura segura (8px) por encima del obstáculo más alto (insignia o plica)
                    const bracketY = minObstacleY - 8;
                    const midX = (x1 + x2) / 2;
                    const numText = '3';

                    context.save();
                    context.font = '800 13px "Plus Jakarta Sans", Georgia, serif';
                    const textW = context.measureText(numText).width;
                    const gap = (textW / 2) + 5;

                    // Pastilla protectora para asegurar contraste y legibilidad absoluta
                    context.fillStyle = '#ffffff';
                    context.fillRect(midX - gap + 1, bracketY - 8, (gap - 1) * 2, 16);

                    context.strokeStyle = '#0f172a';
                    context.fillStyle = '#0f172a';
                    context.lineWidth = 1.5;
                    context.lineCap = 'round';
                    context.lineJoin = 'round';

                    context.beginPath();
                    context.moveTo(x1, bracketY + 5);
                    context.lineTo(x1, bracketY);
                    context.lineTo(midX - gap, bracketY);
                    context.stroke();

                    context.beginPath();
                    context.moveTo(midX + gap, bracketY);
                    context.lineTo(x2, bracketY);
                    context.lineTo(x2, bracketY + 5);
                    context.stroke();

                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(numText, midX, bracketY);
                    context.restore();
                });
            }
        } catch (error) {
            console.error('No se pudo dibujar la partitura del estudio melódico:', error);
            showFeedbackBanner('No se pudo actualizar la partitura. Revisa la consola para más detalles.', 'error');
        }
    }

    function scrollMelodicScoreToNote(globalIdx, behavior = 'smooth') {
        const scrollWrap = el('melodicScoreScrollContainer');
        const canvas = el('melodicPhraseCanvas');
        const hitBox = (state.melodicStudio.noteHitBoxes || []).find(hit => hit.globalIdx === globalIdx);
        const logicalWidth = parseFloat(canvas?.dataset.logicalWidth) || 1280;
        const logicalHeight = parseFloat(canvas?.dataset.logicalHeight) || 1570;
        if (!scrollWrap || !canvas || !hitBox) return;
        requestAnimationFrame(() => {
            const canvasRect = canvas.getBoundingClientRect();
            const wrapRect = scrollWrap.getBoundingClientRect();
            const scaleX = canvasRect.width / logicalWidth;
            const scaleY = canvasRect.height / logicalHeight;
            const noteLeft = scrollWrap.scrollLeft + canvasRect.left - wrapRect.left + hitBox.x * scaleX;
            const noteRight = noteLeft + hitBox.w * scaleX;
            const visibleLeft = scrollWrap.scrollLeft;
            const visibleRight = visibleLeft + scrollWrap.clientWidth;
            let targetLeft = visibleLeft;
            if (noteLeft < visibleLeft + 24) {
                targetLeft = Math.max(0, noteLeft - 24);
            } else if (noteRight > visibleRight - 24) {
                targetLeft = noteRight - scrollWrap.clientWidth + 24;
            }
            if (Math.abs(targetLeft - visibleLeft) > 1) {
                scrollWrap.scrollTo({
                    left: targetLeft,
                    behavior
                });
            }

            const noteTop = canvasRect.top + hitBox.y * scaleY;
            const noteBottom = noteTop + hitBox.h * scaleY;
            const safeTop = 64;
            const safeBottom = window.innerHeight - 64;
            let verticalDelta = 0;
            if (noteTop < safeTop) {
                verticalDelta = noteTop - safeTop;
            } else if (noteBottom > safeBottom) {
                verticalDelta = noteBottom - safeBottom;
            }
            if (Math.abs(verticalDelta) > 1) {
                window.scrollBy({ top: verticalDelta, behavior });
            }
        });
    }

    function navigateMelodicStudioNote(delta) {
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        if (!notesList.length) return;
        const current = state.melodicStudio.selectedNoteIdx;
        const start = current === null ? (delta > 0 ? -1 : 0) : current;
        state.melodicStudio.selectedNoteIdx = (start + delta + notesList.length) % notesList.length;
        const note = notesList[state.melodicStudio.selectedNoteIdx];
        const voicing = state.melodicStudio.autoFilledPhraseVoicings[state.melodicStudio.selectedNoteIdx];
        if (note && !note.isRest) {
            if (voicing?.notesWithOct?.length) playNotesList(voicing.notesWithOct, voicing.implicitBassNote);
            else triggerUpperVoiceNotes([note.note], '8n');
        }
        renderMelodicStudioUI();
    }

    // Gran Pentagrama del Entrenador Principal (Notas < C4 en Clave de Fa)
    function drawMusicalStaff(notesWithOctave = []) {
        try {
            const canvas = el('musicalStaffCanvas');
            const VF = window.Vex ? window.Vex.Flow : null;
            if (!canvas || !VF || !VF.Renderer) return;
            const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, StaveConnector } = VF;

            const validNotes = notesWithOctave.filter(n => n && n.includes('/'));
            const hasLow = validNotes.some(n => getNoteWithOctaveMidi(n) < 60);
            const useGrand = state.staffMode === 'grand' || (state.staffMode === 'auto' && (state.includeBass || hasLow));

            const width = 440, height = useGrand ? 255 : 185;
            canvas.dataset.logicalWidth = String(width);
            canvas.dataset.logicalHeight = String(height);

            const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
            renderer.resize(width, height);
            canvas.style.width = '100%';
            canvas.style.height = 'auto';

            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.fillStyle = '#0f172a';
            context.strokeStyle = '#0f172a';

            const ctx = renderer.getContext();
            const trebleStave = new Stave(24, 24, 205);
            trebleStave.addClef("treble").setContext(ctx).draw();
            let bassStave = null;
            if (useGrand) {
                bassStave = new Stave(24, 128, 205);
                bassStave.addClef("bass").setContext(ctx).draw();
                if (StaveConnector) {
                    new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
                    new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
                }
            }
            state.lastRenderedStaves = { treble: trebleStave, bass: bassStave, useGrand };
            if (!validNotes.length) return;

            const voiceItems = validNotes.map((n, vIdx) => ({
                note: n, voiceIdx: vIdx, midi: getNoteWithOctaveMidi(n),
                label: state.orderedLabelsForDisplay[vIdx] || '',
                status: vIdx === 0 ? 'lead' : (state.validatedCells[vIdx] || 'pending')
            }));
            const sorted = [...voiceItems].sort((a, b) => a.midi - b.midi);
            const tItems = useGrand ? sorted.filter(it => it.midi >= 60) : sorted;
            const bItems = useGrand ? sorted.filter(it => it.midi < 60) : [];

            const drawGroup = (items, st, clef) => {
                if (!items.length || !st) return;
                const sn = new StaveNote({ keys: items.map(i => i.note), duration: "w", clef });
                items.forEach((it, idx) => {
                    const acc = it.note.split('/')[0].substring(1);
                    if (acc) sn.addModifier(new Accidental(acc), idx);
                    const col = it.status === 'lead' ? '#2563eb' : (it.status === 'correct' ? '#16a34a' : (it.status === 'error' ? '#dc2626' : '#0f172a'));
                    sn.setKeyStyle(idx, { fillStyle: col, strokeStyle: col });
                });
                const v = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables([sn]);
                new Formatter().joinVoices([v]).format([v], 120);
                v.draw(ctx, st);
            };
            drawGroup(tItems, trebleStave, "treble");
            drawGroup(bItems, bassStave, "bass");

            context.save();
            context.fillStyle = '#f8fafc';
            context.strokeStyle = '#cbd5e1';
            context.fillRect(238, 16, 192, Math.max(120, voiceItems.length * 24 + 24));
            context.strokeRect(238, 16, 192, Math.max(120, voiceItems.length * 24 + 24));
            context.font = '800 10.5px "Plus Jakarta Sans", sans-serif';
            context.fillStyle = '#334155';
            context.fillText('VOCES (Agudo ➔ Grave):', 246, 31);
            voiceItems.forEach((it, idx) => {
                const rowY = 48 + idx * 22;
                context.fillStyle = it.status === 'lead' ? '#dbeafe' : (it.status === 'correct' ? '#dcfce7' : (it.status === 'error' ? '#fee2e2' : '#e2e8f0'));
                context.fillRect(244, rowY - 12, 180, 18);
                context.font = '800 10.5px "JetBrains Mono", monospace';
                context.fillStyle = '#0f172a';
                context.fillText((idx + 1) + 'ª: ' + formatScientificPitch(it.note) + ' (' + it.label + ')', 248, rowY + 1);
            });
            context.restore();
        } catch (e) {}
    }

    function updatePianoVisuals(activeNotesWithOctave = []) {
        const p = el('piano-container');
        if (!p) return;
        const valid = (activeNotesWithOctave || []).filter(Boolean);
        const leadMidi = valid.length ? getNoteWithOctaveMidi(valid[0]) : null;
        const otherMidis = new Set(valid.slice(1).map(n => getNoteWithOctaveMidi(n)));
        p.querySelectorAll('.piano-key').forEach(k => {
            k.classList.remove('selected', 'given-note-highlight');
            const m = getNoteWithOctaveMidi(k.dataset.note);
            if (leadMidi !== null && m === leadMidi) k.classList.add('given-note-highlight');
            else if (otherMidis.has(m)) k.classList.add('selected');
        });
    }

    function showFeedbackBanner(message, type = 'info') {
        const banner = el('validationFeedbackBanner');
        if (!banner) return;
        if (!message) { banner.classList.add('hidden'); return; }
        banner.className = 'w-full mt-2.5 p-2 rounded-lg text-xs font-bold text-center border ' +
            (type === 'success' ? 'bg-green-100 text-green-900 border-green-400' : (type === 'error' ? 'bg-red-100 text-red-900 border-red-400' : 'bg-blue-100 text-blue-900 border-blue-300'));
        banner.innerHTML = message;
    }

    function loadHarmonizationIntoMainBlock(noteObj, comp) {
        if (!noteObj || !comp?.notesWithOct?.length) return;
        state.chordRoot = comp.effectiveBassRoot || noteObj.barChordRoot || 'C';
        state.chordTypeKey = comp.effectiveChordTypeKey || noteObj.barChordTypeKey || 'maj7';
        state.givenNoteWithOctave = comp.notesWithOct[0];
        state.givenNote = state.givenNoteWithOctave.split('/')[0];
        const leadLabel = comp.labels[0] || noteObj.targetLeadLabel || '1';
        const plainLeadLabel = String(leadLabel).match(/^[#b]*\d+/)?.[0] || leadLabel;
        const chordIntervals = chordStructures[state.chordTypeKey]?.intervals || [];
        state.givenLabel = chordIntervals.some(interval => interval.label === plainLeadLabel)
            ? plainLeadLabel
            : leadLabel;
        state.orderedLabelsForDisplay = [...comp.labels];
        state.correctNotesWithOctave = [...comp.notesWithOct];
        state.correctNotes = comp.notesWithOct.map(note => note.split('/')[0]);
        state.selectedUserNotes = [...comp.notesWithOct];
        state.validatedCells = comp.notesWithOct.map((_, index) => index > 0 ? 'correct' : null);
        state.editingCellIndex = null;
        state.studioHarmonicBlockVisible = true;
    }

    function populatePracticeChordTypeSelect() {
        const sel = el('practiceChordTypeSelect');
        if (!sel) return;
        const currentVal = state.forcedChordTypeKey || 'auto';
        let html = '<option value="auto">🎲 Aleatorio (Nivel)</option>';
        if (state.difficulty === 'basic') {
            html += '<optgroup label="Nivel Básico: Tríadas a 3 voces">';
            const basicKeys = ['major', 'minor', 'augmented', 'diminished', 'sus2', 'sus4'];
            basicKeys.forEach(k => {
                const chord = chordStructures[k];
                if (!chord) return;
                const label = chord.cifrado ? `${chord.cifrado} (${chord.name})` : chord.name;
                html += `<option value="${k}">${label}</option>`;
            });
            html += '</optgroup>';
        } else {
            html += '<optgroup label="Tríadas a 3 voces (Básico)">';
            ['major', 'minor', 'augmented', 'diminished', 'sus2', 'sus4'].forEach(k => {
                const chord = chordStructures[k];
                if (!chord) return;
                const label = chord.cifrado ? `${chord.cifrado} (${chord.name})` : chord.name;
                html += `<option value="${k}">${label}</option>`;
            });
            html += '</optgroup>';
            html += '<optgroup label="Acordes a 4 voces (Intermedio / Avanzado)">';
            Object.keys(chordStructures).filter(k => chordStructures[k].difficulty !== 'basic').forEach(k => {
                const chord = chordStructures[k];
                const label = chord.cifrado ? `${chord.cifrado} (${chord.name})` : chord.name;
                html += `<option value="${k}">${label}</option>`;
            });
            html += '</optgroup>';
        }
        sel.innerHTML = html;
        sel.value = (state.difficulty === 'basic' && chordStructures[currentVal]?.difficulty !== 'basic') ? 'auto' : currentVal;
    }

    function updateDisplay() {
        const pSel = el('practiceChordTypeSelect');
        if (pSel) {
            if (pSel.options.length <= 1) populatePracticeChordTypeSelect();
            pSel.value = state.forcedChordTypeKey || 'auto';
        }
        const rootDisp = displayNote(state.chordRoot);
        const cif = chordStructures[state.chordTypeKey]?.cifrado || '';
        const noteDisp = displayNote(state.givenNote);
        const intervalName = chordStructures[state.chordTypeKey]?.intervals
            ?.find(interval => interval.label === state.givenLabel)?.name || state.givenLabel;
        const hideId = state.dictationMode && !state.exerciseSolved && !state.studioHarmonicBlockVisible;
        const prompt = el('chordConstructionPrompt');
        if (prompt) {
            prompt.textContent = state.studioHarmonicBlockVisible
                ? '🎼 Bloque armónico de la armonización seleccionada (agudo ➔ grave):'
                : (state.difficulty === 'basic'
                    ? 'Construye la tríada a 3 voces (agudo ➔ grave):'
                    : 'Construye el acorde (agudo ➔ grave):');
        }
        if (el('chordQuestionText')) {
            const kindLabel = state.difficulty === 'basic' ? 'de la tríada' : 'del acorde';
            el('chordQuestionText').innerHTML = hideId
                ? `👂 <strong>${noteDisp}</strong> es la 1ª voz de un <strong>Acorde en Dictado (?)</strong>.`
                : `<strong>${noteDisp}</strong> es <strong>${intervalName} (${state.givenLabel})</strong> ${kindLabel} de <strong>${rootDisp}${cif}</strong>.`;
        }
        if (el('staffChordHeader')) {
            const typeLabel = state.difficulty === 'basic' ? 'Tríada' : 'Acorde';
            el('staffChordHeader').innerHTML = hideId ? `👂 Dictado — 1ª Voz: ${noteDisp}` : `🎼 ${typeLabel}: ${rootDisp}${cif} — 1ª Voz: ${noteDisp} (${state.givenLabel})`;
        }
        for (let i = 0; i < 5; i++) {
            const cell = el('gridCell' + i);
            if (!cell) continue;
            cell.className = 'grid-cell';
            if (state.orderedLabelsForDisplay[i]) {
                const iSpan = cell.querySelector('.interval-label');
                const nSpan = cell.querySelector('.note-display');
                if (iSpan) iSpan.textContent = hideId ? (i === 0 ? '1ª Voz' : (i + 1) + 'ª Voz') : state.orderedLabelsForDisplay[i];
                const uNote = state.selectedUserNotes[i];
                if (nSpan) nSpan.textContent = i === 0 ? noteDisp : (uNote ? displayNote(uNote.split('/')[0]) : '?');
                if (i > 0 && uNote) {
                    if (state.validatedCells[i] === 'correct') cell.classList.add('cell-correct');
                    else if (state.validatedCells[i] === 'enharmonic') cell.classList.add('cell-enharmonic-warn');
                    else if (state.validatedCells[i] === 'error') cell.classList.add('cell-error');
                }
                if (i > 0 && state.editingCellIndex === i) cell.classList.add('cell-editing');
            } else {
                cell.classList.add('hidden');
            }
        }
        if (el('streakCounter')) el('streakCounter').textContent = state.stats.dailyStreak || 0;
        if (el('valCorrect')) el('valCorrect').textContent = state.stats.totalCorrect || 0;
        if (el('valIncorrect')) el('valIncorrect').textContent = state.stats.totalIncorrect || 0;
        if (el('errorBankCount')) el('errorBankCount').textContent = (state.stats.errorBank || []).length;
        if (el('currentUserName')) el('currentUserName').textContent = state.currentUser;
        if (el('batchProgressText')) {
            const freq = state.evaluation.exercisesPerEval;
            el('batchProgressText').textContent = freq > 0 ? `${state.evaluation.questionsAttemptedInBatch}/${freq}` : 'Libre';
        }
        updatePianoVisuals(state.selectedUserNotes);
        drawMusicalStaff(state.selectedUserNotes);
    }

    function addUserVoiceNote(note) {
        const maxV = state.orderedLabelsForDisplay.length;
        const idx = state.editingCellIndex !== null ? state.editingCellIndex : state.selectedUserNotes.length;
        if (idx >= maxV) return;
        const prevMidi = getNoteWithOctaveMidi(state.selectedUserNotes[idx - 1] || state.givenNoteWithOctave);
        let oct = Math.floor(prevMidi / 12) - 1;
        let cand = getNoteWithOctaveMidi(note + '/' + oct);
        while (cand >= prevMidi) { oct--; cand -= 12; }
        while (cand < prevMidi - 12) { oct++; cand += 12; }
        state.selectedUserNotes[idx] = note + '/' + oct;
        state.validatedCells[idx] = null;
        if (state.editingCellIndex !== null) state.editingCellIndex = null;
        showFeedbackBanner('');
        triggerUpperVoiceNotes([state.selectedUserNotes[idx]], "8n");
        updateDisplay();
    }

    function applyAccidentalToActiveVoice(acc) {
        const idx = state.editingCellIndex !== null ? state.editingCellIndex : (state.selectedUserNotes.length - 1);
        if (idx < 1 || !state.selectedUserNotes[idx]) return;
        const [np, oct] = state.selectedUserNotes[idx].split('/');
        const base = np.charAt(0).toUpperCase();
        const curAcc = np.substring(1);
        let newAcc = '';
        if (acc === '♮') {
            newAcc = '';
        } else if (acc === '#') {
            if (curAcc === '#') newAcc = '##';
            else if (curAcc === '##') newAcc = '';
            else newAcc = '#';
        } else if (acc === 'b') {
            if (curAcc === 'b') newAcc = 'bb';
            else if (curAcc === 'bb') newAcc = '';
            else newAcc = 'b';
        } else if (curAcc === acc) {
            newAcc = '';
        } else {
            newAcc = acc;
        }
        state.selectedUserNotes[idx] = base + newAcc + '/' + oct;
        state.validatedCells[idx] = null;
        triggerUpperVoiceNotes([state.selectedUserNotes[idx]], "8n");
        updateDisplay();
    }

    function generateNoteButtons() {
        const natC = el('naturalNoteButtons'), accC = el('accidentalButtons');
        if (!natC || !accC) return;
        natC.innerHTML = naturalNotes.map(n => `<button type="button" class="note-button" data-note="${n}">${displayNote(n)}</button>`).join('');
        const accLabels = { "#": "# (Sost.)", "b": "b (Bemol)", "♮": "♮ (Nat.)", "##": "## (𝄪)", "bb": "bb (𝄫)" };
        accC.innerHTML = accidentals.map(a => `<button type="button" class="note-button" data-acc="${a}">${accLabels[a] || a}</button>`).join('');
        natC.querySelectorAll('button').forEach(b => b.addEventListener('click', e => addUserVoiceNote(e.currentTarget.dataset.note)));
        accC.querySelectorAll('button').forEach(b => b.addEventListener('click', e => applyAccidentalToActiveVoice(e.currentTarget.dataset.acc)));
    }

    function generatePiano() {
        const p = el('piano-container');
        if (!p) return;
        p.innerHTML = '';
        for (let oct = 3; oct <= 5; oct++) {
            naturalNotes.forEach(n => {
                const k = document.createElement('div');
                k.className = 'piano-key white';
                k.dataset.note = n + '/' + oct;
                p.appendChild(k);
            });
        }
        const c6 = document.createElement('div');
        c6.className = 'piano-key white';
        c6.dataset.note = 'C/6';
        p.appendChild(c6);
        const blacks = { "C#/3":1, "D#/3":2, "F#/3":4, "G#/3":5, "A#/3":6, "C#/4":8, "D#/4":9, "F#/4":11, "G#/4":12, "A#/4":13, "C#/5":15, "D#/5":16, "F#/5":18, "G#/5":19, "A#/5":20 };
        for (const n in blacks) {
            const k = document.createElement('div');
            k.className = 'piano-key black';
            k.dataset.note = n;
            k.style.left = `calc(100% / 22 * ${blacks[n]})`;
            p.appendChild(k);
        }
        p.querySelectorAll('.piano-key').forEach(k => k.addEventListener('click', e => {
            const fullNoteWithOct = e.currentTarget.dataset.note;
            if (state.melodicStudio.isActive && state.melodicStudio.selectedNoteIdx !== null) {
                const [pName, octStr] = fullNoteWithOct.split('/');
                if (el('liveEditPitchSelect')) {
                    const optExists = Array.from(el('liveEditPitchSelect').options).some(o => o.value === pName);
                    el('liveEditPitchSelect').value = optExists ? pName : simplifySingleNoteEnharmonic(pName, false);
                }
                if (el('liveEditOctaveSelect')) el('liveEditOctaveSelect').value = octStr;
                applyLiveNoteModification(true);
                return;
            }
            addUserVoiceNote(fullNoteWithOct.split('/')[0]);
        }));
    }

    // Punto 10: Continuidad Armónica de 8 Compases Evaluados como un Solo Ejercicio
    function computeContinuityLinkBetweenMeasures(prevVoicesWithOctave, nextRoot, nextChordTypeKey) {
        const cData = chordStructures[nextChordTypeKey] || chordStructures['maj7'];
        const rulesObj = cData.continuity_rules || cData.voicing_rules;
        const leads = Object.keys(rulesObj).filter(l => !['9','b9','#9','11','#11','13','b13'].includes(l));
        const prevPcs = prevVoicesWithOctave.slice(0, 4).map(n => getNoteSemitone(n.split('/')[0]));
        const prevMidis = prevVoicesWithOctave.slice(0, 4).map(n => getNoteWithOctaveMidi(n));

        // 1) Buscar si existe inversión con nota(s) común(es) en la misma voz
        let bestCommon = null;
        for (const l of leads) {
            const base = buildCloseVoicingForChordAndLead(nextRoot, nextChordTypeKey, l);
            const pcs = base.notesWithOct.map(n => getNoteSemitone(n.split('/')[0]));
            const commonIndices = [];
            for (let v = 0; v < Math.min(4, pcs.length); v++) {
                if (pcs[v] === prevPcs[v]) commonIndices.push(v);
            }
            if (commonIndices.length > 0) {
                // Ajustar octava de la 1ra voz para que la voz común conserve exactamente la misma octava que tenía
                const refV = commonIndices[0];
                const targetCommonMidi = prevMidis[refV];
                const currentCommonMidi = getNoteWithOctaveMidi(base.notesWithOct[refV]);
                const octShift = Math.round((targetCommonMidi - currentCommonMidi) / 12);
                const [topName, topOctStr] = base.notesWithOct[0].split('/');
                const adjustedTop = `${topName}/${parseInt(topOctStr, 10) + octShift}`;
                const rebuilt = buildCloseVoicingForChordAndLead(nextRoot, nextChordTypeKey, l, adjustedTop);
                const topDist = Math.abs(getNoteWithOctaveMidi(rebuilt.notesWithOct[0]) - prevMidis[0]);
                if (!bestCommon || commonIndices.length > bestCommon.commonVoiceIndices.length || topDist < bestCommon.topDist) {
                    bestCommon = {
                        leadLabel: l,
                        notesWithOct: rebuilt.notesWithOct,
                        labels: rebuilt.labels,
                        commonVoiceIndices: commonIndices,
                        linkType: 'common',
                        leadDeltaSemitones: getNoteWithOctaveMidi(rebuilt.notesWithOct[0]) - prevMidis[0],
                        topDist
                    };
                }
            }
        }
        if (bestCommon) return bestCommon;

        // 2) Sin nota en común: la 1ra voz se mueve siempre a la nota del acorde más cercana
        let bestClosest = null;
        for (const l of leads) {
            const intObj = cData.intervals.find(i => i.label === l) || cData.intervals[0];
            const topName = calculateNoteName(nextRoot, intObj);
            for (let oct = 4; oct <= 6; oct++) {
                const candTop = `${topName}/${oct}`;
                const candMidi = getNoteWithOctaveMidi(candTop);
                const dist = Math.abs(candMidi - prevMidis[0]);
                if (!bestClosest || dist < bestClosest.dist) {
                    const rebuilt = buildCloseVoicingForChordAndLead(nextRoot, nextChordTypeKey, l, candTop);
                    bestClosest = {
                        leadLabel: l,
                        notesWithOct: rebuilt.notesWithOct,
                        labels: rebuilt.labels,
                        commonVoiceIndices: [],
                        linkType: 'closest_lead',
                        leadDeltaSemitones: candMidi - prevMidis[0],
                        dist
                    };
                }
            }
        }
        return bestClosest;
    }

    function generateContinuity8Bars() {
        const rootsPool = ["C", "F", "G", "Bb", "Eb", "D", "A"];
        const typesPool = ['maj7', 'm7', '7', 'm7b5', 'dim7', 'major', 'minor'];
        const measures = [];
        let prevVoices = null;
        for (let i = 0; i < 8; i++) {
            let root = rootsPool[Math.floor(Math.random() * rootsPool.length)];
            if (i > 0 && root === measures[i - 1].root) {
                root = rootsPool[(rootsPool.indexOf(root) + 2) % rootsPool.length];
            }
            const cKey = typesPool[Math.floor(Math.random() * typesPool.length)];
            const rulesObj = chordStructures[cKey].continuity_rules || chordStructures[cKey].voicing_rules;
            const leads = Object.keys(rulesObj).filter(l => !['9','b9','#9','11','#11','13','b13'].includes(l));
            let leadLabel = leads[Math.floor(Math.random() * leads.length)] || '1';
            let built = buildCloseVoicingForChordAndLead(root, cKey, leadLabel);
            let commonVoiceIndices = [];
            let linkType = 'initial';
            let leadDeltaSemitones = 0;

            if (i > 0 && prevVoices) {
                const linked = computeContinuityLinkBetweenMeasures(prevVoices, root, cKey);
                if (linked) {
                    leadLabel = linked.leadLabel;
                    built = { labels: linked.labels, notesWithOct: linked.notesWithOct };
                    commonVoiceIndices = linked.commonVoiceIndices;
                    linkType = linked.linkType;
                    leadDeltaSemitones = linked.leadDeltaSemitones;
                }
            }
            prevVoices = [...built.notesWithOct];
            measures.push({
                barNumber: i + 1, root, chordTypeKey: cKey, leadLabel,
                completed: false, attemptsOnBar: 0, errorsOnBar: 0,
                solvedNotes: [], expectedNotes: built.notesWithOct,
                expectedLabels: built.labels,
                commonVoiceIndices, linkType, leadDeltaSemitones
            });
        }
        state.continuity.measures = measures;
        state.continuity.currentBar = 0;
        state.continuity.previousVoicesWithOctave = [];
        state.continuity.runHits = 0;
        state.continuity.runErrors = 0;
        state.continuity.runRetries = 0;
        loadContinuityBar(0);
    }

    function loadContinuityBar(barIdx) {
        state.studioHarmonicBlockVisible = false;
        state.continuity.currentBar = barIdx;
        const barObj = state.continuity.measures[barIdx];
        if (!barObj) return;

        if (barIdx > 0 && state.continuity.previousVoicesWithOctave.length >= 4) {
            const linked = computeContinuityLinkBetweenMeasures(state.continuity.previousVoicesWithOctave, barObj.root, barObj.chordTypeKey);
            if (linked) {
                barObj.leadLabel = linked.leadLabel;
                barObj.expectedNotes = [...linked.notesWithOct];
                barObj.expectedLabels = [...linked.labels];
                barObj.commonVoiceIndices = [...linked.commonVoiceIndices];
                barObj.linkType = linked.linkType;
                barObj.leadDeltaSemitones = linked.leadDeltaSemitones;
            }
        }
        state.continuity.commonVoiceIndices = barObj.commonVoiceIndices || [];
        if (barIdx === 0) {
            state.continuity.linkExplanation = 'Compás 1/8: Armoniza el primer acorde en posición cerrada a 4 voces.';
        } else if (barObj.commonVoiceIndices && barObj.commonVoiceIndices.length > 0) {
            const keptStr = barObj.commonVoiceIndices.map(vIdx => `${vIdx + 1}ª voz (${formatScientificPitch(barObj.expectedNotes[vIdx])})`).join(', ');
            state.continuity.linkExplanation = `🟢 Compás ${barIdx + 1}/8 (Nota Común): Se mantiene en la misma voz ${keptStr}.`;
        } else {
            const prevTop = state.continuity.previousVoicesWithOctave[0] || barObj.expectedNotes[0];
            state.continuity.linkExplanation = `🟣 Compás ${barIdx + 1}/8 (Sin Nota Común): La 1.ª voz se mueve de ${formatScientificPitch(prevTop)} a la nota del acorde más cercana (${formatScientificPitch(barObj.expectedNotes[0])}).`;
        }

        state.chordRoot = barObj.root;
        state.chordTypeKey = barObj.chordTypeKey;
        state.givenLabel = barObj.leadLabel;
        state.givenNoteWithOctave = barObj.expectedNotes[0];
        state.givenNote = barObj.expectedNotes[0].split('/')[0];
        state.orderedLabelsForDisplay = [...barObj.expectedLabels];
        state.correctNotesWithOctave = [...barObj.expectedNotes];
        state.correctNotes = barObj.expectedNotes.map(x => x.split('/')[0]);
        state.selectedUserNotes = [state.givenNoteWithOctave];
        state.validatedCells = [null, null, null, null, null];
        state.editingCellIndex = null;
        state.exerciseSolved = false;
        renderContinuityPanel();
        updateDisplay();
    }

    function renderContinuityPanel() {
        const panel = el('continuityPanel');
        if (!panel) return;
        panel.classList.toggle('hidden', !state.continuityMode);
        panel.classList.toggle('flex', state.continuityMode);
        el('continuityModeBadge')?.classList.toggle('hidden', !state.continuityMode);
        if (!state.continuityMode) return;
        if (el('continuityLiveStatsBadge')) {
            el('continuityLiveStatsBadge').textContent = `Compás ${state.continuity.currentBar + 1}/8 • Aciertos: ${state.continuity.runHits}/8 • Errores: ${state.continuity.runErrors} • Repeticiones: ${state.continuity.runRetries}`;
        }
        const cont = el('continuityBarsContainer');
        if (cont) {
            cont.innerHTML = state.continuity.measures.map((m, idx) => {
                const cif = chordStructures[m.chordTypeKey]?.cifrado || '';
                const isCur = idx === state.continuity.currentBar;
                return `<div data-cont-bar="${idx}" class="p-1.5 rounded-lg border text-center cursor-pointer ${isCur ? 'bg-teal-600 text-white font-extrabold' : (m.completed ? 'bg-green-100 text-green-900 border-green-400 font-bold' : 'bg-white text-slate-700')}">
                    <div class="text-[10px]">C${idx + 1}${m.completed ? ' ✓' : ''}</div>
                    <div class="text-xs font-extrabold">${displayNote(m.root)}${cif}</div>
                </div>`;
            }).join('');
            cont.querySelectorAll('[data-cont-bar]').forEach(b => b.addEventListener('click', e => loadContinuityBar(parseInt(e.currentTarget.dataset.contBar, 10))));
        }
        if (el('continuityPrevChordInfo')) el('continuityPrevChordInfo').textContent = state.continuity.linkExplanation || '';
    }

    function openContinuitySummaryModal(forceViewRecordIdx = null) {
        const all8Completed = state.continuity.measures.length === 8 && state.continuity.measures.every(m => m.completed);
        const historyList = state.stats.continuityHistory || [];
        const lockNotice = el('continuityInProgressLockNotice');
        const scoreWrapper = el('continuityScoreSectionWrapper');
        const histSelect = el('continuityHistorySelect');

        if (histSelect) {
            if (historyList.length === 0) {
                histSelect.innerHTML = '<option value="-1">-- Sin ejercicios finalizados --</option>';
            } else {
                histSelect.innerHTML = historyList.map((rec, idx) =>
                    `<option value="${idx}">#${historyList.length - idx} • ${rec.date} (${rec.hits}/8 ✅ • Rep: ${rec.retries})</option>`
                ).join('');
            }
        }

        // Si el ejercicio en curso NO se ha terminado, no se puede mostrar el ejercicio en curso; solo se muestra el historial de continuidades ya realizadas
        if (!all8Completed && historyList.length === 0) {
            if (lockNotice) {
                lockNotice.classList.remove('hidden');
                lockNotice.innerHTML = `🔒 <strong>Ejercicio en curso (${state.continuity.runHits}/8 compases completados):</strong> La partitura del ejercicio en curso no se puede mostrar hasta que termines los 8 compases. Completa los compases restantes para desbloquear su partitura y guardarla en tu Historial de Continuidad.`;
            }
            if (scoreWrapper) scoreWrapper.classList.add('hidden');
            if (el('continuityEvalMetricsBanner')) {
                el('continuityEvalMetricsBanner').innerHTML = `Completa los 8 compases actuales para ver la evaluación y el enlace en partitura.`;
            }
            el('continuitySummaryModalOverlay')?.classList.add('visible');
            return;
        }

        if (scoreWrapper) scoreWrapper.classList.remove('hidden');
        const viewIdx = forceViewRecordIdx !== null ? forceViewRecordIdx : 0;
        state.continuity.viewingHistoryIdx = viewIdx;
        if (histSelect && historyList[viewIdx]) histSelect.value = String(viewIdx);

        const activeRecord = historyList[viewIdx] || {
            date: 'Recién completado',
            hits: state.continuity.runHits,
            errors: state.continuity.runErrors,
            retries: state.continuity.runRetries,
            measures: state.continuity.measures
        };

        if (!all8Completed && lockNotice) {
            lockNotice.classList.remove('hidden');
            lockNotice.innerHTML = `ℹ️ <strong>Mostrando Historial de Continuidades Realizadas:</strong> Tu ejercicio en curso (${state.continuity.runHits}/8 compases) se agregará aquí en cuanto completes su 8.º compás.`;
        } else if (lockNotice) {
            lockNotice.classList.add('hidden');
        }

        const banner = el('continuityEvalMetricsBanner');
        if (banner) {
            banner.innerHTML = `📊 Evaluación (${activeRecord.date}): <span class="text-emerald-700">✅ Aciertos: ${activeRecord.hits}/8</span> • <span class="text-red-600">❌ Errores cometidos: ${activeRecord.errors}</span> • <span class="text-amber-700">🔄 Veces que se repitió para lograrlo: ${activeRecord.retries}</span>`;
        }
        const measuresToShow = activeRecord.measures || [];
        const cards = el('continuitySummaryCards');
        if (cards) {
            cards.innerHTML = measuresToShow.map((m, idx) => {
                const cif = chordStructures[m.chordTypeKey]?.cifrado || '';
                const voices = (m.solvedNotes && m.solvedNotes.length === 4) ? m.solvedNotes : m.expectedNotes;
                const commonSet = new Set(m.commonVoiceIndices || []);
                const isClosestLeadMove = idx > 0 && commonSet.size === 0;
                const prevVoices = idx > 0 ? ((measuresToShow[idx - 1].solvedNotes?.length === 4) ? measuresToShow[idx - 1].solvedNotes : measuresToShow[idx - 1].expectedNotes) : null;

                const vHtml = voices.map((n, vIdx) => {
                    const isCommon = idx > 0 && commonSet.has(vIdx);
                    const isClosestLead = isClosestLeadMove && vIdx === 0;
                    let rowStyle = 'px-1 py-0.5 rounded flex justify-between items-center text-[10px] ';
                    let badgeTxt = '';
                    if (isCommon) {
                        rowStyle += 'bg-emerald-200 text-emerald-950 font-extrabold border-l-4 border-emerald-600';
                        badgeTxt = ' 🔗 Mant.';
                    } else if (isClosestLead) {
                        const prevLeadPitch = prevVoices ? formatScientificPitch(prevVoices[0]) : '';
                        rowStyle += 'bg-purple-200 text-purple-950 font-extrabold border-l-4 border-purple-600';
                        badgeTxt = ` ➔ de ${prevLeadPitch}`;
                    }
                    return `<div class="${rowStyle}"><span>${vIdx + 1}ª:</span><span class="font-mono font-bold">${formatScientificPitch(n)}${badgeTxt}</span></div>`;
                }).join('');

                const linkHeaderTag = idx === 0
                    ? '<div class="text-[9px] font-bold text-slate-600 mb-1">🎯 Posición Inicial</div>'
                    : (commonSet.size > 0
                        ? `<div class="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1 rounded mb-1">🟢 Nota Común (${Array.from(commonSet).map(v => (v + 1) + 'ª').join(',')})</div>`
                        : `<div class="text-[9px] font-extrabold text-purple-800 bg-purple-100 px-1 rounded mb-1">🟣 1ª Voz ➔ Más Cercana</div>`);

                return `<div data-sum-bar="${idx}" class="p-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-teal-50 cursor-pointer space-y-0.5">
                    <div class="font-extrabold text-xs text-teal-800 border-b pb-0.5">C${idx + 1}: ${displayNote(m.root)}${cif}</div>
                    ${linkHeaderTag}
                    ${vHtml}
                    <div class="text-[9px] text-slate-500 pt-0.5">Repeticiones: ${Math.max(0, (m.attemptsOnBar || 1) - 1)}</div>
                </div>`;
            }).join('');
            cards.querySelectorAll('[data-sum-bar]').forEach(c => c.addEventListener('click', e => {
                const bIdx = parseInt(e.currentTarget.dataset.sumBar, 10);
                const m = measuresToShow[bIdx];
                if (m) {
                    const v = (m.solvedNotes && m.solvedNotes.length === 4) ? m.solvedNotes : m.expectedNotes;
                    triggerUpperVoiceNotes(v, "2n");
                    triggerDeepBassNote(getImplicitBassWithOctave(m.root, getNoteWithOctaveMidi(v[3])), "2n");
                    drawContinuityFullScore(bIdx, measuresToShow);
                }
            }));
        }
        el('continuitySummaryModalOverlay')?.classList.add('visible');
        drawContinuityFullScore(-1, measuresToShow);
    }

    function drawContinuityFullScore(activeBarIdx = -1, customMeasuresList = null) {
        try {
            const canvas = el('continuityFullScoreCanvas');
            const VF = window.Vex ? window.Vex.Flow : null;
            if (!canvas || !VF || !VF.Renderer) return;
            const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, StaveConnector } = VF;
            const measuresSource = customMeasuresList || state.continuity.measures;
            const width = 980, height = 540;
            const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
            renderer.resize(width, height);
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.fillStyle = '#0f172a';
            context.strokeStyle = '#0f172a';
            const ctx = renderer.getContext();

            const renderedCoordsByBar = [];

            for (let row = 0; row < 2; row++) {
                const yTreble = row * 262 + 64;
                const yBass = yTreble + 92;
                for (let col = 0; col < 4; col++) {
                    const barIdx = row * 4 + col;
                    const m = measuresSource[barIdx];
                    if (!m) continue;
                    const x = 20 + col * 234, w = 234;
                    const trebleStave = new Stave(x, yTreble, w);
                    const bassStave = new Stave(x, yBass, w);
                    if (col === 0) { trebleStave.addClef("treble"); bassStave.addClef("bass"); }
                    trebleStave.setContext(ctx).draw();
                    bassStave.setContext(ctx).draw();
                    if (col === 0 && StaveConnector) {
                        new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
                        new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
                    }
                    if (StaveConnector) {
                        new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
                    }

                    const upper = (m.solvedNotes && m.solvedNotes.length === 4) ? m.solvedNotes : (m.expectedNotes || []);
                    if (!upper.length) continue;

                    const commonSet = new Set(m.commonVoiceIndices || []);
                    const isClosestLeadMove = barIdx > 0 && commonSet.size === 0;
                    const prevMeasure = barIdx > 0 ? measuresSource[barIdx - 1] : null;
                    const prevUpper = prevMeasure ? ((prevMeasure.solvedNotes && prevMeasure.solvedNotes.length === 4) ? prevMeasure.solvedNotes : (prevMeasure.expectedNotes || [])) : [];

                    // Encabezado del compás y Guía Superior de Enlace de Voces despejada (sin cruzar notas ni alteraciones)
                    const cif = chordStructures[m.chordTypeKey]?.cifrado || '';
                    context.save();
                    context.font = '800 13.5px "Plus Jakarta Sans", Georgia, serif';
                    context.fillStyle = barIdx === activeBarIdx ? '#d97706' : '#0f172a';
                    context.fillText(`[${barIdx + 1}] ${displayNote(m.root)}${cif}`, x + 6, yTreble - 36);

                    let guideBg = '#f1f5f9', guideBorder = '#94a3b8', guideTextCol = '#334155', guideSummary = '🎯 Posición Inicial (4 Voces)';
                    if (barIdx > 0) {
                        if (commonSet.size > 0) {
                            guideBg = '#d1fae5'; guideBorder = '#059669'; guideTextCol = '#065f46';
                            const keptList = Array.from(commonSet).map(v => `${v + 1}ª=${formatScientificPitch(upper[v])}`).join(', ');
                            guideSummary = `🟢 Mant.: ${keptList}`;
                        } else {
                            guideBg = '#ede9fe'; guideBorder = '#7c3aed'; guideTextCol = '#5b21b6';
                            const fromLead = prevUpper[0] ? formatScientificPitch(prevUpper[0]) : '';
                            guideSummary = `🟣 1ª Voz: ${fromLead} ➔ ${formatScientificPitch(upper[0])}`;
                        }
                    }
                    context.fillStyle = guideBg;
                    context.strokeStyle = guideBorder;
                    context.lineWidth = 1.3;
                    context.fillRect(x + 4, yTreble - 30, w - 10, 17);
                    context.strokeRect(x + 4, yTreble - 30, w - 10, 17);
                    context.font = '800 9.5px "JetBrains Mono", monospace';
                    context.fillStyle = guideTextCol;
                    context.fillText(guideSummary, x + 8, yTreble - 18);
                    context.restore();

                    const voiceItems = upper.map((noteStr, vIdx) => ({
                        noteStr,
                        vIdx,
                        midi: getNoteWithOctaveMidi(noteStr),
                        isCommon: barIdx > 0 && commonSet.has(vIdx),
                        isClosestLead: isClosestLeadMove && vIdx === 0
                    })).sort((a, b) => a.midi - b.midi);

                    const sortedKeys = voiceItems.map(it => it.noteStr);
                    const tSn = new StaveNote({ keys: sortedKeys, duration: "w", clef: "treble" });
                    voiceItems.forEach((it, kIdx) => {
                        const acc = it.noteStr.split('/')[0].substring(1);
                        if (acc) tSn.addModifier(new Accidental(acc), kIdx);
                        if (it.isCommon) {
                            tSn.setKeyStyle(kIdx, { fillStyle: '#059669', strokeStyle: '#059669' });
                        } else if (it.isClosestLead) {
                            tSn.setKeyStyle(kIdx, { fillStyle: '#7c3aed', strokeStyle: '#7c3aed' });
                        } else {
                            tSn.setKeyStyle(kIdx, { fillStyle: '#0f172a', strokeStyle: '#0f172a' });
                        }
                    });

                    const tv = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables([tSn]);
                    new Formatter().joinVoices([tv]).format([tv], 78);
                    tv.draw(ctx, trebleStave);

                    const bassNote = getImplicitBassWithOctave(m.root, voiceItems[0].midi);
                    const bSn = new StaveNote({ keys: [bassNote], duration: "w", clef: "bass" });
                    const bAcc = bassNote.split('/')[0].substring(1);
                    if (bAcc) bSn.addModifier(new Accidental(bAcc), 0);
                    const bv = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables([bSn]);
                    new Formatter().joinVoices([bv]).format([bv], 78);
                    bv.draw(ctx, bassStave);

                    // Columna ordenada de las 4 voces a la derecha del compás (1ª a 4ª voz de agudo a grave) sin pisar las cabezas de nota
                    const noteX = tSn.getAbsoluteX();
                    const ys = (typeof tSn.getYs === 'function') ? tSn.getYs() : [];
                    const voiceCoordMap = {};
                    const labelColumnX = x + w - 82;

                    voiceItems.forEach((it, kIdx) => {
                        const yVal = ys[kIdx] !== undefined ? ys[kIdx] : (yTreble + 34 - kIdx * 9);
                        const badgeY = yTreble + 4 + it.vIdx * 16;
                        voiceCoordMap[it.vIdx] = { x: noteX, y: yVal, badgeX: labelColumnX, badgeY, noteStr: it.noteStr, isCommon: it.isCommon, isClosestLead: it.isClosestLead };

                        context.save();
                        if (it.isCommon) {
                            context.fillStyle = 'rgba(16, 185, 129, 0.22)';
                            context.strokeStyle = '#059669';
                            context.lineWidth = 1.6;
                            context.beginPath();
                            context.arc(noteX + 6, yVal, 6.2, 0, Math.PI * 2);
                            context.fill();
                            context.stroke();
                        } else if (it.isClosestLead) {
                            context.fillStyle = 'rgba(124, 58, 237, 0.22)';
                            context.strokeStyle = '#7c3aed';
                            context.lineWidth = 1.6;
                            context.beginPath();
                            context.arc(noteX + 6, yVal, 6.2, 0, Math.PI * 2);
                            context.fill();
                            context.stroke();
                        }

                        // Tarjeta lateral de cada voz (1ª a 4ª)
                        const boxBg = it.isCommon ? '#d1fae5' : (it.isClosestLead ? '#ede9fe' : '#f8fafc');
                        const boxBorder = it.isCommon ? '#059669' : (it.isClosestLead ? '#7c3aed' : '#cbd5e1');
                        const boxTxt = it.isCommon ? '#065f46' : (it.isClosestLead ? '#5b21b6' : '#475569');
                        const prefix = it.isCommon ? '🟢' : (it.isClosestLead ? '🟣' : '•');

                        context.fillStyle = boxBg;
                        context.strokeStyle = boxBorder;
                        context.lineWidth = it.isCommon || it.isClosestLead ? 1.4 : 0.9;
                        context.fillRect(labelColumnX, badgeY - 7, 76, 14);
                        context.strokeRect(labelColumnX, badgeY - 7, 76, 14);
                        context.font = '800 8.8px "JetBrains Mono", monospace';
                        context.fillStyle = boxTxt;
                        context.fillText(`${prefix}${it.vIdx + 1}ª:${formatScientificPitch(it.noteStr)}`, labelColumnX + 3, badgeY + 3);
                        context.restore();
                    });

                    renderedCoordsByBar[barIdx] = { row, col, x, w, yTreble, voiceCoordMap };
                }
            }

            // Trazar guías limpias de enlace entre compases sin cruzar alteraciones
            for (let b = 1; b < 8; b++) {
                const prev = renderedCoordsByBar[b - 1];
                const curr = renderedCoordsByBar[b];
                const m = measuresSource[b];
                if (!prev || !curr || !m || prev.row !== curr.row) continue;

                const commonList = m.commonVoiceIndices || [];
                if (commonList.length > 0) {
                    commonList.forEach(vIdx => {
                        const p1 = prev.voiceCoordMap[vIdx];
                        const p2 = curr.voiceCoordMap[vIdx];
                        if (!p1 || !p2) return;
                        context.save();
                        context.strokeStyle = 'rgba(5, 150, 105, 0.75)';
                        context.lineWidth = 1.8;
                        context.setLineDash([4, 3]);
                        context.beginPath();
                        context.moveTo(p1.badgeX + 76, p1.badgeY - 1);
                        context.lineTo(p2.x - 18, p2.y);
                        context.stroke();
                        context.restore();
                    });
                } else {
                    const p1 = prev.voiceCoordMap[0];
                    const p2 = curr.voiceCoordMap[0];
                    if (p1 && p2) {
                        context.save();
                        context.strokeStyle = 'rgba(124, 58, 237, 0.85)';
                        context.fillStyle = '#7c3aed';
                        context.lineWidth = 2;
                        context.beginPath();
                        context.moveTo(p1.badgeX + 76, p1.badgeY - 1);
                        context.lineTo(p2.x - 18, p2.y);
                        context.stroke();
                        context.beginPath();
                        context.arc(p2.x - 18, p2.y, 3, 0, Math.PI * 2);
                        context.fill();
                        context.restore();
                    }
                }
            }
        } catch (e) {}
    }

    function playContinuitySequence(withDeepBass = true) {
        const historyList = state.stats.continuityHistory || [];
        const activeRecord = historyList[state.continuity.viewingHistoryIdx];
        const measuresToPlay = (activeRecord && activeRecord.measures) ? activeRecord.measures : state.continuity.measures;
        const stepMs = parseInt(el('continuityTempoSelect')?.value || '900', 10);
        measuresToPlay.forEach((m, idx) => {
            setTimeout(() => {
                drawContinuityFullScore(idx, measuresToPlay);
                const v = (m.solvedNotes && m.solvedNotes.length === 4) ? m.solvedNotes : m.expectedNotes;
                triggerUpperVoiceNotes(v, "2n");
                if (withDeepBass) {
                    triggerDeepBassNote(getImplicitBassWithOctave(m.root, getNoteWithOctaveMidi(v[3])), "2n");
                }
            }, idx * stepMs);
        });
    }

    function checkVoicingAcousticAlert(notesWithOct) {
        if (!notesWithOct || notesWithOct.length < 2) return null;
        const midis = notesWithOct.map(n => getNoteWithOctaveMidi(n)).sort((a, b) => a - b);
        const lowestMidi = midis[0];
        const secondLowestMidi = midis[1];
        const lowestInterval = secondLowestMidi - lowestMidi;
        if (lowestMidi < 48 && lowestInterval < 3) {
            return '⚠️ LIL: Intervalo grave muy cerrado (< 3m debajo de C3). Sugerencia: Drop 2 o Spread.';
        }
        if (lowestMidi < 41 && lowestInterval < 4) {
            return '⚠️ LIL: Intervalo grave inferior a 4ª justa bajo F2. Riesgo de opacidad acústica.';
        }
        const topMidis = [...midis].reverse();
        if (topMidis.length >= 2 && topMidis[0] - topMidis[1] === 1) {
            return '⚠️ Disonancia: 2ª menor entre las voces superiores.';
        }
        return null;
    }

    function renderLivePermutationsChips() {
        const cont = el('livePermutationsContainer');
        if (!cont) return;
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const cur = notesList[selIdx];
        if (!cur || cur.isRest || !ex) {
            cont.innerHTML = '<span class="text-[11px] text-slate-400 italic">Selecciona una nota para permutar tensiones</span>';
            return;
        }
        const curArr = state.melodicStudio.selectedMultiPermutationsByNote[selIdx] || [];
        const baseVoicingNoPerm = computeHarmonizationForMelodicNote(cur, null, true);
        const validPermKeys = getValidPerpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63(cur, baseVoicingNoPerm, curArr);
        if (!validPermKeys.length) {
            cont.innerHTML = '<span class="text-[11px] text-slate-400 italic">Sin permutaciones disponibles para este acorde</span>';
            return;
        }
        cont.innerHTML = validPermKeys.map(pid => {
            const p = HARMONIZATION_TECHNIQUES_CATALOG[pid];
            const isAct = curArr.includes(pid);
            return `<button type="button" data-live-perm="${pid}" class="px-2 py-0.5 rounded text-xs font-bold border transition cursor-pointer ${isAct ? 'bg-purple-600 text-white border-purple-700 shadow-sm' : 'bg-white text-purple-900 border-purple-300 hover:bg-purple-50'}">${isAct ? '✓ ' : '+ '}${p.shortName}</button>`;
        }).join(' ');

        cont.querySelectorAll('[data-live-perm]').forEach(btn => {
            btn.addEventListener('click', e => {
                const pid = e.currentTarget.dataset.livePerm;
                const pObj = HARMONIZATION_TECHNIQUES_CATALOG[pid];
                let arr = state.melodicStudio.selectedMultiPermutationsByNote[selIdx] || [];
                if (arr.includes(pid)) {
                    state.melodicStudio.selectedMultiPermutationsByNote[selIdx] = arr.filter(x => x !== pid);
                } else {
                    arr = arr.filter(existingId => {
                        const existing = HARMONIZATION_TECHNIQUES_CATALOG[existingId];
                        return existing && existing.targetRole !== pObj.targetRole;
                    });
                    arr.push(pid);
                    state.melodicStudio.selectedMultiPermutationsByNote[selIdx] = arr;
                }
                const comp = computeHarmonizationForMelodicNote(cur);
                state.melodicStudio.autoFilledPhraseVoicings[selIdx] = comp;
                playNotesList(comp.notesWithOct, comp.implicitBassNote);
                renderMelodicStudioUI();
                showFeedbackBanner(`🔀 Permutación [${pObj.shortName}] ${arr.includes(pid) ? 'aplicada' : 'retirada'}.`, 'success');
            });
        });
    }

    function pushStudioUndoState() {
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        if (!ex) return;
        state.melodicStudio.undoStack.push({
            measures: JSON.parse(JSON.stringify(ex.measures)),
            selectedNoteIdx: state.melodicStudio.selectedNoteIdx
        });
        if (state.melodicStudio.undoStack.length > 25) {
            state.melodicStudio.undoStack.shift();
        }
        state.melodicStudio.redoStack = [];
        updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
        if (el('studioUndoBtn')) {
            el('studioUndoBtn').disabled = state.melodicStudio.undoStack.length === 0;
        }
        if (el('studioRedoBtn')) {
            el('studioRedoBtn').disabled = state.melodicStudio.redoStack.length === 0;
        }
    }

    function undoStudioAction() {
        if (!state.melodicStudio.undoStack.length) return;
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        if (!ex) return;
        state.melodicStudio.redoStack.push({
            measures: JSON.parse(JSON.stringify(ex.measures)),
            selectedNoteIdx: state.melodicStudio.selectedNoteIdx
        });
        const prev = state.melodicStudio.undoStack.pop();
        ex.measures = prev.measures;
        state.melodicStudio.selectedNoteIdx = prev.selectedNoteIdx;
        state.melodicStudio.autoFilledPhraseVoicings = {};
        renderMelodicStudioUI();
        updateUndoRedoButtons();
        showFeedbackBanner('↩️ Acción deshecha.', 'info');
    }

    function redoStudioAction() {
        if (!state.melodicStudio.redoStack.length) return;
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        if (!ex) return;
        state.melodicStudio.undoStack.push({
            measures: JSON.parse(JSON.stringify(ex.measures)),
            selectedNoteIdx: state.melodicStudio.selectedNoteIdx
        });
        const next = state.melodicStudio.redoStack.pop();
        ex.measures = next.measures;
        state.melodicStudio.selectedNoteIdx = next.selectedNoteIdx;
        state.melodicStudio.autoFilledPhraseVoicings = {};
        renderMelodicStudioUI();
        updateUndoRedoButtons();
        showFeedbackBanner('↪️ Acción rehecha.', 'info');
    }

    function shiftSelectedMelodicNotePitch(delta) {
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const cur = notesList[selIdx];
        if (!cur || cur.isRest) return;
        pushStudioUndoState();
        const currentMidi = getNoteWithOctaveMidi(cur.note);
        const newMidi = Math.max(36, Math.min(84, currentMidi + delta));
        const newNote = midiToNoteWithOctave(newMidi, cur.note.includes('b'));
        const [pName, octStr] = newNote.split('/');
        if (el('liveEditPitchSelect')) el('liveEditPitchSelect').value = pName;
        if (el('liveEditOctaveSelect')) el('liveEditOctaveSelect').value = octStr;
        applyLiveNoteModification(false);
    }

    function triggerMetronomeClick(accent = false) {
        try {
            const ctx = Tone.context;
            if (!ctx || ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = accent ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(accent ? 1500 : 950, ctx.currentTime);
            gain.gain.setValueAtTime(accent ? 0.25 : 0.14, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (accent ? 0.045 : 0.03));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {}
    }

    // Punto 6: Sincronización de la Barra de Modificación en Vivo para Melodía/Armonía Aleatoria o de Estudio
    function syncLiveElementEditorBar() {
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        if (!ex || !notesList.length) return;
        const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const curNote = notesList[selIdx] || notesList[0];
        const curMeasure = ex.measures[curNote.measureIdx] || ex.measures[0];

        if (el('liveEditPitchSelect')) {
            const rawPitch = curNote.isRest ? 'REST' : curNote.note.split('/')[0];
            const pSel = el('liveEditPitchSelect');
            if (curNote.isRest) {
                pSel.value = 'REST';
            } else {
                const optExists = Array.from(pSel.options).some(o => o.value === rawPitch);
                pSel.value = optExists ? rawPitch : simplifySingleNoteEnharmonic(rawPitch, false);
            }
        }
        if (el('liveEditOctaveSelect')) {
            el('liveEditOctaveSelect').disabled = Boolean(curNote.isRest);
            if (!curNote.isRest) {
                el('liveEditOctaveSelect').value = curNote.note.split('/')[1] || '5';
            }
        }
        if (el('liveEditDurSelect')) {
            el('liveEditDurSelect').value = curNote.dur || 'q';
        }

        const chordTypesList = Object.keys(chordStructures);
        ['liveEditChord1Root', 'liveEditChord2Root'].forEach(id => {
            const s = el(id);
            if (s && s.options.length !== allRoots.length) {
                s.innerHTML = allRoots.map(r => `<option value="${r}">${displayNote(r)}</option>`).join('');
            }
        });
        ['liveEditChord1Type', 'liveEditChord2Type'].forEach(id => {
            const s = el(id);
            if (s && s.options.length !== chordTypesList.length) {
                s.innerHTML = chordTypesList.map(k => {
                    const c = chordStructures[k];
                    const label = c?.cifrado ? `${c.cifrado} (${c.name})` : (c?.name || k);
                    return `<option value="${k}">${label}</option>`;
                }).join('');
            }
        });

        const hr = curMeasure.harmonicRhythm || [{ root: curMeasure.chordRoot, type: curMeasure.chordTypeKey, startBeat: 0, durationBeats: 4 }];
        const isTwoChords = hr.length >= 2;
        if (el('liveEditBarSplitSelect')) el('liveEditBarSplitSelect').value = isTwoChords ? '2' : '1';
        if (el('liveEditChord2Group')) el('liveEditChord2Group').classList.toggle('hidden', !isTwoChords);
        if (el('liveEditChord2Group')) el('liveEditChord2Group').classList.toggle('inline-flex', isTwoChords);
        if (el('liveEditChord1Root')) el('liveEditChord1Root').value = hr[0].root;
        if (el('liveEditChord1Type')) el('liveEditChord1Type').value = hr[0].type;
        if (isTwoChords && hr[1]) {
            if (el('liveEditChord2Root')) el('liveEditChord2Root').value = hr[1].root;
            if (el('liveEditChord2Type')) el('liveEditChord2Type').value = hr[1].type;
        }
        const scaleSelect = el('liveEditChordScaleSelect');
        if (scaleSelect) {
            const activeChordType = (curNote.startBeatInBar >= 2 && isTwoChords && hr[1])
                ? hr[1].type
                : (hr[0].type || curNote.barChordTypeKey || 'maj7');
            const scalesForType = CHORD_SCALE_CONTEXT_CATALOG[activeChordType] || CHORD_SCALE_CONTEXT_CATALOG['maj7'] || [];
            scaleSelect.innerHTML = scalesForType.map(sc => `<option value="${sc.id}">${sc.name}</option>`).join('');
            const currentScaleId = (curNote.startBeatInBar >= 2 && isTwoChords && hr[1])
                ? (hr[1].scaleId || curNote.barScaleId)
                : (hr[0].scaleId || curNote.barScaleId);
            if (scalesForType.some(sc => sc.id === currentScaleId)) {
                scaleSelect.value = currentScaleId;
            } else if (scalesForType.length) {
                scaleSelect.value = scalesForType[0].id;
            }
        }

        const usedBeats = curMeasure.notes.reduce((sum, n) => sum + getBeatsForDuration(n.dur), 0);
        const timeSig = curMeasure.timeSignature || ex.timeSignature || '4/4';
        const maxBeats = parseInt(timeSig.split('/')[0], 10) || 4;
        const balanceBadge = el('liveBarBeatBalanceBadge');
        if (balanceBadge) {
            const diff = +(usedBeats - maxBeats).toFixed(2);
            if (Math.abs(diff) < 0.01) {
                balanceBadge.className = 'px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
                balanceBadge.textContent = `Compás ${curNote.bar}: ${usedBeats.toFixed(1)} / ${maxBeats}T ✅`;
            } else if (diff < 0) {
                balanceBadge.className = 'px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300';
                balanceBadge.textContent = `Compás ${curNote.bar}: ${usedBeats.toFixed(1)} / ${maxBeats}T ⏳ (Falta ${Math.abs(diff)}T)`;
            } else {
                balanceBadge.className = 'px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300';
                balanceBadge.textContent = `Compás ${curNote.bar}: ${usedBeats.toFixed(1)} / ${maxBeats}T ⚠️ (Excede +${diff}T)`;
            }
        }

        const alertBadge = el('liveVoicingAlertBadge');
        if (alertBadge) {
            const comp = state.melodicStudio.autoFilledPhraseVoicings[selIdx];
            const alertMsg = checkVoicingAcousticAlert(comp?.notesWithOct);
            if (alertMsg) {
                alertBadge.classList.remove('hidden');
                alertBadge.textContent = alertMsg;
            } else {
                alertBadge.classList.add('hidden');
            }
        }
        updateUndoRedoButtons();
        renderLivePermutationsChips();
    }

    function ensureExampleAutoFilled(exId) {
        if (state.melodicStudio.stepByStepMode) return;
        const notesList = getFlattenedNotesFromExample(exId || state.melodicStudio.exampleId);
        notesList.forEach(n => {
            if (n.isRest || state.melodicStudio.manuallyClearedNotes[n.globalIdx]) return;
            const cl = n.activeClassObj || n.classifications[0];
            const options = cl.options || [];
            const independentOptions = cl.separateIndLeadOptions || [];
            const tonicOptions = cl.separateTonicOptions || [];
            let tId = state.melodicStudio.selectedHarmonizationByNote[n.globalIdx] || cl.defaultOpt || options[0] || 'principal_4way';
            if (![...options, ...independentOptions, ...tonicOptions].includes(tId)) {
                tId = cl.defaultOpt || options[0] || 'principal_4way';
            }
            state.melodicStudio.selectedHarmonizationByNote[n.globalIdx] = tId;
            state.melodicStudio.autoFilledPhraseVoicings[n.globalIdx] = computeHarmonizationForMelodicNote(n, tId);
        });
    }

    function getFirstNoteIndexOfSelectedBar() {
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        if (!notesList.length) return 0;
        const selectedIndex = state.melodicStudio.selectedNoteIdx;
        if (selectedIndex === null || !notesList[selectedIndex]) return 0;
        const selectedBar = notesList[selectedIndex].bar;
        const firstNote = notesList.find(note => note.bar === selectedBar);
        return firstNote ? firstNote.globalIdx : selectedIndex;
    }

    function applySmartAnalysisAutoFill() {
        stopStudioPhrasePlayback();
        state.melodicStudio.autoFillSeed = (state.melodicStudio.autoFillSeed || 0) + 1;
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const selectedIndex = state.melodicStudio.selectedNoteIdx;

        if (selectedIndex !== null && notesList[selectedIndex] && !notesList[selectedIndex].isRest) {
            const note = notesList[selectedIndex];
            const classification = note.activeClassObj || note.classifications[0];
            const options = [
                ...(classification.options || []),
                ...(classification.separateIndLeadOptions || []),
                ...(classification.separateTonicOptions || [])
            ];
            if (!options.length) {
                showFeedbackBanner('⚠️ No hay técnicas válidas para armonizar esta nota.', 'info');
                return;
            }
            delete state.melodicStudio.manuallyClearedNotes[selectedIndex];
            const currentTechnique = state.melodicStudio.selectedHarmonizationByNote[selectedIndex]
                || classification.defaultOpt
                || options[0];
            const nextIndex = (options.indexOf(currentTechnique) + 1) % options.length;
            const nextTechnique = options[nextIndex];
            harmonizeNoteOrGroupInStudio(note, nextTechnique);
            const composition = state.melodicStudio.autoFilledPhraseVoicings[selectedIndex];
            if (composition) playNotesList(composition.notesWithOct, composition.implicitBassNote);
            renderMelodicStudioUI();
            showFeedbackBanner(`⚡ Acorde en Compás ${note.bar} armonizado con [${HARMONIZATION_TECHNIQUES_CATALOG[nextTechnique]?.shortName || nextTechnique}].`, 'success');
            return;
        }

        state.melodicStudio.stepByStepMode = false;
        state.melodicStudio.manuallyClearedNotes = {};
        notesList.forEach((note, index) => {
            if (note.isRest) return;
            const classification = note.activeClassObj || note.classifications[0];
            const options = classification.options || [];
            const techniquePool = options.length ? options : ['principal_4way'];
            const selectedTechnique = techniquePool[(index + state.melodicStudio.autoFillSeed) % techniquePool.length];
            state.melodicStudio.selectedHarmonizationByNote[note.globalIdx] = selectedTechnique;
            state.melodicStudio.autoFilledPhraseVoicings[note.globalIdx] =
                computeHarmonizationForMelodicNote(note, selectedTechnique);
        });
        renderMelodicStudioUI();
        showFeedbackBanner('⚡ Frase completa rellenada combinando las opciones válidas del análisis melódico.', 'success');
    }

    function renderMelodicStudioUI() {
        const panel = el('melodicAnalysisStudioPanel');
        if (!panel) return;
        panel.classList.toggle('hidden', !state.melodicStudio.isActive);
        panel.classList.toggle('flex', state.melodicStudio.isActive);
        el('mainAppContainer')?.classList.toggle('compact-mode', !state.melodicStudio.isActive);
        el('studioActiveTopBadge')?.classList.toggle('hidden', !state.melodicStudio.isActive);
        if (el('toggleApproachNotationBtn')) {
            const showSecondaryLabel = state.melodicStudio.approachNotation === 'S';
            el('toggleApproachNotationBtn').textContent = `Aproximación: ${showSecondaryLabel ? 'S' : 'd'}`;
            el('toggleApproachNotationBtn').setAttribute('aria-pressed', String(showSecondaryLabel));
        }
        if (el('scoreAnnotationModeSelect')) {
            el('scoreAnnotationModeSelect').value = state.melodicStudio.scoreAnnotationMode;
        }

        if (!state.melodicStudio.isActive) {
            el('floatingHarmonizationModal')?.classList.add('hidden');
            return;
        }

        ensureExampleAutoFilled(state.melodicStudio.exampleId);
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const selectedNote = notesList[state.melodicStudio.selectedNoteIdx];
        const enharmonicButton = el('toggleSelectedNoteEnharmonicBtn');
        if (enharmonicButton) {
            const currentSpelling = state.melodicStudio.enharmonicNoteSpellingByNote[state.melodicStudio.selectedNoteIdx];
            const contextualSpelling = selectedNote && !selectedNote.isRest
                ? getContextualEnharmonicSpelling(selectedNote)
                : null;
            enharmonicButton.disabled = !selectedNote || selectedNote.isRest || (!currentSpelling && !contextualSpelling);
            enharmonicButton.textContent = currentSpelling
                ? `Enarmonía: restaurar ${formatScientificPitch(selectedNote.sourceNote)}`
                : `Enarmonía: convertir${contextualSpelling ? ` a ${displayNote(contextualSpelling)}` : ''}`;
            enharmonicButton.setAttribute('aria-pressed', String(Boolean(currentSpelling)));
            enharmonicButton.title = currentSpelling
                ? 'Restaurar la escritura original de la nota seleccionada'
                : 'Reescribir la nota seleccionada con la ortografía de su escala de llegada';
        }
        syncLiveElementEditorBar();

        // Sombreado en la barra inferior exclusivo para conjuntos de 2, 3 o más notas hacia el acorde objetivo
        let stripGroupSet = new Set();
        if (state.melodicStudio.selectedNoteIdx !== null && notesList[state.melodicStudio.selectedNoteIdx] && !notesList[state.melodicStudio.selectedNoteIdx].isRest) {
            const sNote = notesList[state.melodicStudio.selectedNoteIdx];
            const sTech = state.melodicStudio.selectedHarmonizationByNote[sNote.globalIdx] || sNote.activeClassObj?.defaultOpt || 'principal_4way';
            const gIndices = getGroupIndicesForHarmonization(sNote, sTech, notesList);
            if (gIndices.length >= 2) stripGroupSet = new Set(gIndices);
        }

        const strip = el('melodicNoteStripContainer');
        if (strip) {
            strip.innerHTML = notesList.map((n, idx) => {
                const isSel = idx === state.melodicStudio.selectedNoteIdx;
                const isGroupMember = stripGroupSet.size >= 2 && stripGroupSet.has(idx);
                const lbl = n.isRest ? '𝄽' : formatScientificPitch(n.note);
                const btnCls = isSel
                    ? (isGroupMember
                        ? 'bg-indigo-700 text-white border-2 border-amber-400 ring-2 ring-indigo-400 shadow-md'
                        : 'bg-emerald-600 text-white shadow')
                    : (isGroupMember
                        ? 'bg-amber-500 text-white border-2 border-amber-700 shadow'
                        : 'bg-white text-slate-800');
                return `<button type="button" data-note-idx="${idx}" class="toolbar-btn shrink-0 ${btnCls}">C${n.bar}: ${lbl}</button>`;
            }).join('');
            strip.querySelectorAll('[data-note-idx]').forEach(b => b.addEventListener('click', e => {
                const idx = parseInt(e.currentTarget.dataset.noteIdx, 10);
                state.melodicStudio.selectedNoteIdx = idx;
                renderMelodicStudioUI();
            }));
        }

        const selectedPermNoteIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const selectedPermNote = notesList[selectedPermNoteIdx] || notesList[0];
        const renderPermutationOptions = (permCont) => {
            if (!permCont) return;
            const curArr = state.melodicStudio.selectedMultiPermutationsByNote[selectedPermNoteIdx] || [];
            const baseVoicingNoPerm = selectedPermNote
                ? computeHarmonizationForMelodicNote(selectedPermNote, null, true)
                : null;
            const validPermKeys = getValidPerpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63(selectedPermNote, baseVoicingNoPerm, curArr);
            if (!validPermKeys.length) {
                permCont.innerHTML = `<span class="text-[10px] text-slate-500 italic">Sin permutaciones disponibles para este bloque</span>`;
            } else {
                permCont.innerHTML = validPermKeys.map(pid => {
                    const p = HARMONIZATION_TECHNIQUES_CATALOG[pid];
                    const act = curArr.includes(pid);
                    return `<button type="button" data-perm="${pid}" class="px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer ${act ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-purple-900 border-purple-300'}">${act ? '✓ ' : '+ '}${p.shortName}</button>`;
                }).join('');
                permCont.querySelectorAll('[data-perm]').forEach(b => b.addEventListener('click', e => {
                    const pid = e.currentTarget.dataset.perm;
                    const tIdx = selectedPermNoteIdx;
                    const arr = state.melodicStudio.selectedMultiPermutationsByNote[tIdx] || [];
                    const pObj = HARMONIZATION_TECHNIQUES_CATALOG[pid];
                    if (arr.includes(pid)) {
                        state.melodicStudio.selectedMultiPermutationsByNote[tIdx] = arr.filter(x => x !== pid);
                    } else {
                        // Filtrar cualquier permutación previa que colisione en rol origen o en nota destino
                        const cleaned = arr.filter(existingId => {
                            const ex = HARMONIZATION_TECHNIQUES_CATALOG[existingId];
                            return ex && ex.targetRole !== pObj.targetRole && ex.subInt?.semitones !== pObj.subInt?.semitones;
                        });
                        cleaned.push(pid);
                        state.melodicStudio.selectedMultiPermutationsByNote[tIdx] = cleaned;
                    }
                    const comp = computeHarmonizationForMelodicNote(notesList[tIdx]);
                    state.melodicStudio.autoFilledPhraseVoicings[tIdx] = comp;
                    playNotesList(comp.notesWithOct, comp.implicitBassNote);
                    renderMelodicStudioUI();
                }));
            }
        };
        renderPermutationOptions(el('studioMultiPermutationContainer'));
        renderPermutationOptions(el('floatingPermutationsContainer'));

        const refIdxForDisp = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const activeDispForSelected = state.melodicStudio.voicingDispositionByNote[refIdxForDisp]
            || state.melodicStudio.voicingDisposition
            || 'close';
        document.querySelectorAll('.studio-drop-btn').forEach(btn => {
            const isAct = btn.dataset.studioDrop === activeDispForSelected;
            btn.className = 'studio-drop-btn px-2 py-1 rounded font-extrabold text-[11px] border-0 cursor-pointer ' +
                (isAct ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 bg-transparent hover:bg-white/60');
        });

        drawMelodicPhraseScore(-1);
        if (state.melodicStudio.selectedNoteIdx !== null) {
            scrollMelodicScoreToNote(state.melodicStudio.selectedNoteIdx);
        }

        const selNoteForBanner = state.melodicStudio.selectedNoteIdx !== null ? notesList[state.melodicStudio.selectedNoteIdx] : notesList[0];
        const selCompForBanner = selNoteForBanner ? state.melodicStudio.autoFilledPhraseVoicings[selNoteForBanner.globalIdx] : null;
        updateStudioLivePlaybackBanner(selNoteForBanner, selCompForBanner, false);

        const floatingModal = el('floatingHarmonizationModal');
        if (state.melodicStudio.selectedNoteIdx === null || !notesList[state.melodicStudio.selectedNoteIdx]) {
            floatingModal?.classList.add('hidden');
            return;
        }
        const curNote = notesList[state.melodicStudio.selectedNoteIdx];
        if (curNote.isRest) {
            floatingModal?.classList.add('hidden');
            return;
        }
        floatingModal?.classList.remove('hidden');
        floatingModal?.classList.add('flex');

        const activeCl = curNote.activeClassObj || curNote.classifications[0];
        const validOptions = activeCl.options || [];
        const sepIndLeadOpts = activeCl.separateIndLeadOptions || [];
        const sepTonicOpts = activeCl.separateTonicOptions || [];
        const sepTonic2Opts = sepTonicOpts.filter(id => !ChosenIs3ChordTonic(id));
        const sepTonic3Opts = sepTonicOpts.filter(ChosenIs3ChordTonic);
        const allCombinedOpts = [...validOptions, ...sepIndLeadOpts, ...sepTonicOpts];

        const savedTech = state.melodicStudio.selectedHarmonizationByNote[curNote.globalIdx];
        const chosenTechId = (savedTech && allCombinedOpts.includes(savedTech)) ? savedTech : (activeCl.defaultOpt || validOptions[0]);
        const floatingDispositionOptions = el('floatingDispositionOptions');
        if (floatingDispositionOptions) {
            const activeDisposition = state.melodicStudio.voicingDispositionByNote[curNote.globalIdx]
                || state.melodicStudio.voicingDisposition
                || 'close';
            floatingDispositionOptions.innerHTML = Object.entries(DISPOSITION_HUMAN_NAMES).map(([id, name]) => {
                const shortName = name.replace(/\s*\([^)]*\)/g, '');
                const isActive = id === activeDisposition;
                return `<button type="button" data-floating-drop="${id}" aria-pressed="${isActive}" title="${name}" class="px-2 py-1 rounded border text-[10px] font-bold ${isActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-800 border-slate-300'}">${shortName}</button>`;
            }).join('');
            floatingDispositionOptions.querySelectorAll('[data-floating-drop]').forEach(button => button.addEventListener('click', event => {
                const selectedDisposition = event.currentTarget.dataset.floatingDrop || 'close';
                state.melodicStudio.voicingDispositionByNote[curNote.globalIdx] = selectedDisposition;
                harmonizeNoteOrGroupInStudio(curNote, chosenTechId);
                const updated = state.melodicStudio.autoFilledPhraseVoicings[curNote.globalIdx];
                if (updated) playNotesList(updated.notesWithOct, updated.implicitBassNote);
                renderMelodicStudioUI();
            }));
        }
        const currentComp = computeHarmonizationForMelodicNote(curNote, chosenTechId);
        loadHarmonizationIntoMainBlock(curNote, currentComp);
        updateDisplay();
        if (el('activeNoteHeaderTitle')) {
            el('activeNoteHeaderTitle').innerHTML = `Compás ${curNote.bar} • Acorde ${curNote.barChordSymbol} • Melodía ${formatScientificPitch(curNote.note)}`;
        }
        if (el('activeNoteBadgesRow')) {
            el('activeNoteBadgesRow').innerHTML =
                `<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px]">${getMelodicAnalysisNotation(curNote, activeCl, state.melodicStudio.approachNotation)}</span>` +
                `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-extrabold text-[10px]">${curNote.barChordSymbol} • ${curNote.barScaleName || 'Jónica'}</span>` +
                `<span class="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-extrabold text-[10px]">${curNote.barFuncName || ''}</span>`;
        }
        if (el('optionsCountBadge')) {
            el('optionsCountBadge').textContent = `${validOptions.length} opciones`;
        }

        const classWrapper = el('analysisClassificationWrapper');
        const classSelector = el('analysisClassificationSelector');
        if (classWrapper && classSelector) {
            classWrapper.classList.remove('hidden');
            if (curNote.classifications && curNote.classifications.length > 1) {
                classSelector.classList.remove('hidden');
                classSelector.innerHTML = curNote.classifications.map(c => {
                    const isAct = c.id === activeCl.id;
                    return `<button type="button" data-class-id="${c.id}" aria-pressed="${isAct}" class="analysis-classification-btn text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${isAct ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-800 border-slate-300'}">${c.title}</button>`;
                }).join('');
                classSelector.querySelectorAll('[data-class-id]').forEach(b => b.addEventListener('click', e => {
                    const cid = e.currentTarget.dataset.classId;
                    state.melodicStudio.selectedClassificationByNote[curNote.globalIdx] = cid;
                    const foundCl = curNote.classifications.find(x => x.id === cid) || curNote.classifications[0];
                    harmonizeNoteOrGroupInStudio(curNote, foundCl.defaultOpt);
                    renderMelodicStudioUI();
                }));
            } else {
                classSelector.classList.add('hidden');
                classSelector.innerHTML = '';
            }
        }

        if (el('activeNoteRuleBox')) {
            el('activeNoteRuleBox').innerHTML = `<strong>Lectura del análisis:</strong> ${activeCl.explain || activeCl.title}`;
        }

        const grpBanner = el('multiNoteGroupBanner');
        if (grpBanner) {
            const grpIndices = getGroupIndicesForHarmonization(curNote, chosenTechId, notesList);
            if (grpIndices.length >= 2) {
                grpBanner.classList.remove('hidden');
                const sequence = grpIndices.map((gi, index) => {
                    const note = notesList[gi];
                    if (!note) return '';
                    const isCurrent = gi === state.melodicStudio.selectedNoteIdx;
                    return `${index > 0 ? '<span class="analysis-sequence-arrow" aria-hidden="true">➜</span>' : ''}<span class="analysis-sequence-note${isCurrent ? ' is-current' : ''}" role="listitem"${isCurrent ? ' aria-current="step"' : ''}>
                        <span class="analysis-sequence-index">${index + 1}</span>
                        <span class="analysis-sequence-detail"><strong>${formatScientificPitch(note.note)}</strong><small>Compás ${note.bar} · ${note.barChordSymbol}</small></span>
                    </span>`;
                }).join('');
                const techniqueName = chosenTechId === 'principal_4way'
                    ? '4-Way Close'
                    : (HARMONIZATION_TECHNIQUES_CATALOG[chosenTechId]?.shortName || '4-Way Close');
                const comparisonWasOpen = grpBanner.querySelector('.analysis-sequence-comparison')?.open || false;
                const comparisonOptionCards = allCombinedOpts.map(techId => {
                    const optionIndices = getGroupIndicesForHarmonization(curNote, techId, notesList);
                    if (optionIndices.length !== grpIndices.length || optionIndices.some((idx, pos) => idx !== grpIndices[pos])) return '';
                    const option = HARMONIZATION_TECHNIQUES_CATALOG[techId];
                    if (!option) return '';
                    const preview = optionIndices.map((idx, pos) => {
                        const stepTechId = getTechniqueForGroupStep(techId, pos, optionIndices.length);
                        const voicing = computeHarmonizationForMelodicNote(notesList[idx], stepTechId);
                        const chordNotes = voicing.notesWithOct.map(formatScientificPitch).join(' · ');
                        return `<span class="analysis-compare-note"><strong>${formatScientificPitch(notesList[idx].note)}</strong><small>${chordNotes}</small></span>`;
                    }).join('');
                    const isChosen = techId === chosenTechId;
                    return `<button type="button" data-group-compare-tech="${techId}" aria-pressed="${isChosen}" class="analysis-compare-option${isChosen ? ' is-selected' : ''}"><span class="analysis-compare-name">${option.shortName}</span><span class="analysis-compare-voicings">${preview}</span><span class="analysis-compare-action">${isChosen ? 'Aplicada' : 'Aplicar'}</span></button>`;
                }).filter(Boolean);
                const compareDetails = comparisonOptionCards.length
                    ? `<details class="analysis-sequence-comparison"><summary>Comparar armonizaciones (${comparisonOptionCards.length})</summary><div class="analysis-compare-list">${comparisonOptionCards.join('')}</div></details>`
                    : '';
                grpBanner.innerHTML = `<div class="analysis-sequence-heading"><strong>Armonización conjunta</strong><span>${grpIndices.length} notas</span></div><div class="analysis-sequence-technique"><span>Técnica aplicada</span><strong>${techniqueName}</strong></div><div class="analysis-sequence-list" role="list" aria-label="Notas que se armonizan juntas">${sequence}</div><div class="analysis-sequence-footer"><p class="analysis-sequence-help">Las notas numeradas forman una sola secuencia armónica.</p><button id="playHarmonizationGroupBtn" type="button" class="analysis-sequence-play-btn">▶ Escuchar conjunto</button></div>${compareDetails}`;
                if (comparisonWasOpen) grpBanner.querySelector('.analysis-sequence-comparison').open = true;
                grpBanner.querySelector('#playHarmonizationGroupBtn')?.addEventListener('click', e => {
                    playHarmonizationGroup(curNote, chosenTechId, e.currentTarget);
                });
                grpBanner.querySelectorAll('[data-group-compare-tech]').forEach(button => button.addEventListener('click', e => {
                    const techId = e.currentTarget.dataset.groupCompareTech;
                    harmonizeNoteOrGroupInStudio(curNote, techId);
                    renderMelodicStudioUI();
                }));
            } else {
                grpBanner.classList.add('hidden');
                grpBanner.innerHTML = '';
            }
        }

        const renderTechOptionButtons = (containerEl, optIds) => {
            if (!containerEl) return;
            containerEl.innerHTML = optIds.map(tid => {
                const tObj = HARMONIZATION_TECHNIQUES_CATALOG[tid];
                if (!tObj) return '';
                const isAct = tid === chosenTechId;
                const isIndLead = tid.startsWith('ind_');
                const isTonic = tid.startsWith('tonic_');
                let btnColors = isAct
                    ? 'bg-indigo-600 text-white border-indigo-700 font-extrabold shadow'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400';
                if (isIndLead) {
                    btnColors = isAct
                        ? 'bg-emerald-800 text-white border-2 border-emerald-950 font-extrabold shadow-md'
                        : 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 hover:bg-emerald-100 font-bold';
                } else if (isTonic) {
                    btnColors = isAct
                        ? 'bg-pink-800 text-white border-2 border-pink-950 font-extrabold shadow-md'
                        : 'bg-pink-50 text-pink-950 border-2 border-pink-500 hover:bg-pink-100 font-bold';
                }
                const previewText = isTonic
                    ? getTWXh8n73LuT5MJ23pd8dCjFskRZckveFbP(tid, curNote.targetRoot || curNote.barChordRoot, curNote.targetType || curNote.barChordTypeKey)
                    : (tObj.desc || '');
                return `<button type="button" data-tech-opt="${tid}" aria-pressed="${isAct}" class="analysis-tech-option-btn text-left p-2 rounded-lg border text-[11px] cursor-pointer ${btnColors}">
                    <div class="font-bold">[${tObj.abbr}] ${tObj.shortName}</div>
                    <div class="text-[10px] opacity-85">${previewText}</div>
                </button>`;
            }).join('');
            containerEl.querySelectorAll('[data-tech-opt]').forEach(btn => btn.addEventListener('click', e => {
                const tid = e.currentTarget.dataset.techOpt;
                harmonizeNoteOrGroupInStudio(curNote, tid);
                const comp = state.melodicStudio.autoFilledPhraseVoicings[curNote.globalIdx];
                if (comp) playNotesList(comp.notesWithOct, comp.implicitBassNote);
                renderMelodicStudioUI();
            }));
        };

        renderTechOptionButtons(el('possibleHarmonizationsContainer'), validOptions);

        const sepWrapper = el('specialSeparateTechniquesWrapper');
        if (sepWrapper) {
            const hasSpecial = sepIndLeadOpts.length > 0 || sepTonicOpts.length > 0;
            sepWrapper.classList.toggle('hidden', !hasSpecial);
            if (el('toggleIndLeadPanelBtn')) {
                el('toggleIndLeadPanelBtn').classList.toggle('hidden', sepIndLeadOpts.length === 0);
                el('toggleIndLeadPanelBtn').textContent = `⚡ Voz Líder Independiente (${sepIndLeadOpts.length})`;
            }
            if (el('toggleTonicPanelBtn')) {
                el('toggleTonicPanelBtn').classList.toggle('hidden', sepTonicOpts.length === 0);
                el('toggleTonicPanelBtn').textContent = `🔗 Tonicizaciones en Tránsito (${sepTonicOpts.length})`;
            }
            const indCont = el('separateIndLeadContainer');
            if (indCont) {
                indCont.classList.toggle('hidden', !state.melodicStudio.showSeparateIndLead || sepIndLeadOpts.length === 0);
                renderTechOptionButtons(indCont, sepIndLeadOpts);
            }
            const tonCont = el('separateTonicContainer');
            if (tonCont) {
                tonCont.classList.toggle('hidden', !state.melodicStudio.showSeparateTonic || sepTonicOpts.length === 0);
                tonCont.classList.toggle('flex', state.melodicStudio.showSeparateTonic && sepTonicOpts.length > 0);
                renderTechOptionButtons(el('separateTonic2ChordsGrid'), sepTonic2Opts);
                renderTechOptionButtons(el('separateTonic3ChordsGrid'), sepTonic3Opts);
            }
        }

    }

    function getAllowedMelodyPitchNames(chordRoot, chordType, scaleId) {
        const chord = chordStructures[chordType] || chordStructures.maj7;
        const scaleCatalog = CHORD_SCALE_CONTEXT_CATALOG[chordType] || CHORD_SCALE_CONTEXT_CATALOG.maj7 || [];
        const scale = scaleCatalog.find(candidate => candidate.id === scaleId) || scaleCatalog[0];
        const pitchNames = new Map();
        (chord?.intervals || []).forEach(interval => {
            const noteName = calculateNoteName(chordRoot, interval);
            pitchNames.set(getNoteSemitone(noteName), noteName);
        });
        const availableTensions = new Set(scale?.availTensions || []);
        const avoidTensions = new Set(scale?.avoid || []);
        getChordScaleIntervals(chordType, scale?.id).forEach(interval => {
            if (availableTensions.has(interval.label) && !avoidTensions.has(interval.label)) {
                const noteName = calculateNoteName(chordRoot, interval);
                if (!pitchNames.has(getNoteSemitone(noteName))) {
                    pitchNames.set(getNoteSemitone(noteName), noteName);
                }
            }
        });
        if (!pitchNames.size) {
            pitchNames.set(getNoteSemitone(chordRoot), chordRoot);
        }
        return [...pitchNames.values()];
    }

    function constrainGeneratedMelodyToHarmony(measure) {
        let beatCursor = 0;
        let replacedNote = false;
        measure.notes.forEach(note => {
            const duration = getBeatsForDuration(note.dur);
            if (note.isRest) {
                beatCursor += duration;
                return;
            }
            const harmony = getActiveChordForMeasureBeat(measure, beatCursor);
            const allowedNotes = getAllowedMelodyPitchNames(harmony.root, harmony.type, harmony.scaleId);
            if (!allowedNotes.length) {
                allowedNotes.push(harmony.root);
            }
            const currentNoteName = note.note.split('/')[0];
            const currentPitchClass = getNoteSemitone(currentNoteName);
            const allowedCurrentNote = allowedNotes.some(name => getNoteSemitone(name) === currentPitchClass);
            if (!allowedCurrentNote) {
                const targetMidi = getNoteWithOctaveMidi(note.note);
                const closestCandidate = allowedNotes.flatMap(name =>
                    [3, 4, 5, 6].map(octave => ({
                        note: `${name}/${octave}`,
                        midi: getNoteWithOctaveMidi(`${name}/${octave}`)
                    }))
                ).sort((a, b) => Math.abs(a.midi - targetMidi) - Math.abs(b.midi - targetMidi))[0];
                note.note = closestCandidate.note;
                note.isWeakBeat = false;
                note.pOrS = 'P';
                replacedNote = true;
            }
            beatCursor += duration;
        });

        if (replacedNote) {
            measure.notes.forEach(note => {
                if (note.groupType) {
                    delete note.groupType;
                    delete note.defaultOpt;
                    note.isWeakBeat = false;
                    note.pOrS = 'P';
                }
            });
        }
    }

    // Generador de melodías aleatorias con notas del acorde o tensiones disponibles (4 y 8 compases).
    function generateRandomMelodicPhrase(barsCount = 4) {
        const styleMode = el('melodicGeneratorStyleSelect')?.value || 'all';
        const progTemplates4 = [
            [
                { r1: "C", t1: "maj7", s1: "ionian", split: 1 },
                { r1: "A", t1: "7", s1: "mixolydian_b9b13", split: 1 },
                { r1: "D", t1: "m7", s1: "dorian", split: 1 },
                { r1: "G", t1: "7", s1: "mixolydian", r2: "C", t2: "maj7", s2: "ionian", split: 2 }
            ],
            [
                { r1: "F", t1: "maj7", s1: "ionian", split: 1 },
                { r1: "E", t1: "m7b5", s1: "locrian_nat2", r2: "A", t2: "7", s2: "mixolydian_b9b13", split: 2 },
                { r1: "D", t1: "m7", s1: "dorian", r2: "Db", t2: "7", s2: "mixolydian_s4", split: 2 },
                { r1: "C", t1: "maj7", s1: "lydian", split: 1 }
            ],
            [
                { r1: "Bb", t1: "maj7", s1: "ionian", split: 1 },
                { r1: "G", t1: "7", s1: "mixolydian_b9b13", split: 1 },
                { r1: "C", t1: "m7", s1: "dorian", r2: "F", t2: "7", s2: "mixolydian", split: 2 },
                { r1: "D", t1: "m7b5", s1: "locrian_nat6", r2: "G", t2: "7", s2: "altered", split: 2 }
            ]
        ];
        const progTemplates8 = [
            [
                { r1: "C", t1: "maj7", s1: "ionian", split: 1 },
                { r1: "B", t1: "m7b5", s1: "locrian_nat6", r2: "E", t2: "7", s2: "mixolydian_b9b13", split: 2 },
                { r1: "A", t1: "m7", s1: "aeolian", r2: "D", t2: "7", s2: "mixolydian_s4", split: 2 },
                { r1: "G", t1: "m7", s1: "dorian", r2: "C", t2: "7", s2: "mixolydian", split: 2 },
                { r1: "F", t1: "maj7", s1: "lydian", split: 1 },
                { r1: "F", t1: "m7", s1: "dorian", r2: "Bb", t2: "7", s2: "mixolydian_s4", split: 2 },
                { r1: "E", t1: "m7", s1: "phrygian", r2: "A", t2: "7", s2: "mixolydian_b9b13", split: 2 },
                { r1: "D", t1: "m7", s1: "dorian", r2: "G", t2: "7", s2: "mixolydian", split: 2 }
            ],
            [
                { r1: "Eb", t1: "maj7", s1: "ionian", split: 1 },
                { r1: "C", t1: "m7", s1: "dorian", split: 1 },
                { r1: "F", t1: "m7", s1: "dorian", r2: "Bb", t2: "7", s2: "mixolydian", split: 2 },
                { r1: "G", t1: "m7", s1: "phrygian", r2: "Gb", t2: "7", s2: "mixolydian_s4", split: 2 },
                { r1: "F", t1: "m7", s1: "dorian", split: 1 },
                { r1: "D", t1: "m7b5", s1: "locrian_nat2", r2: "G", t2: "7", s2: "mixolydian_b9b13", split: 2 },
                { r1: "C", t1: "m7", s1: "dorian", r2: "F", t2: "7", s2: "mixolydian_s4", split: 2 },
                { r1: "F", t1: "m7", s1: "dorian", r2: "Bb", t2: "7", s2: "mixolydian", split: 2 }
            ]
        ];

        const pool = barsCount === 8 ? progTemplates8 : progTemplates4;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const measures = [];

        for (let b = 0; b < barsCount; b++) {
            const spec = picked[b % picked.length];
            const hr = spec.split === 2
                ? [
                    { root: spec.r1, type: spec.t1, startBeat: 0, durationBeats: 2, scaleId: spec.s1 },
                    { root: spec.r2, type: spec.t2, startBeat: 2, durationBeats: 2, scaleId: spec.s2 }
                ]
                : [{ root: spec.r1, type: spec.t1, startBeat: 0, durationBeats: 4, scaleId: spec.s1 }];

            const scale1 = getChordScaleIntervals(spec.t1, spec.s1);
            const r2 = spec.split === 2 ? spec.r2 : spec.r1;
            const t2 = spec.split === 2 ? spec.t2 : spec.t1;
            const s2 = spec.split === 2 ? spec.s2 : spec.s1;
            const scale2 = getChordScaleIntervals(t2, s2);
            const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(r2);

            const pickScaleNote = (root, scList, degIdx, oct = 5) => {
                const intObj = scList[((degIdx % scList.length) + scList.length) % scList.length];
                return `${calculateNoteName(root, intObj)}/${oct}`;
            };

            const contourType = (b + Math.floor(Math.random() * 4)) % 4;
            const targetNote = pickScaleNote(r2, scale2, [2, 4, 0, 6][contourType], 5);
            const targetMidi = getNoteWithOctaveMidi(targetNote);
            let notesInBar = [];

            if (styleMode === 'melodic_grouping' || contourType === 1) {
                // Incluye Resolución Retardada (cromático-diatónico o diatónico-cromático) + blanca/negras
                const nStart = pickScaleNote(spec.r1, scale1, 2, 5);
                const nRR1 = midiToNoteWithOctave(targetMidi + 1, preferFlats);
                const nRR2 = pickScaleNote(r2, scale2, 1, 5);
                notesInBar = [
                    { note: nStart, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: nRR1, dur: "16", isWeakBeat: true, pOrS: "S", groupType: "res_ret_start", defaultOpt: "del_cd" },
                    { note: nRR2, dur: "16", isWeakBeat: true, pOrS: "S", groupType: "res_ret_end", defaultOpt: "del_cd" },
                    { note: targetNote, dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: pickScaleNote(r2, scale2, 4, 5), dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: pickScaleNote(r2, scale2, 2, 5), dur: "q", isWeakBeat: false, pOrS: "P" }
                ];
            } else if (styleMode === 'independent_lead' || contourType === 2) {
                const n1 = pickScaleNote(spec.r1, scale1, 4, 5);
                const nApp = midiToNoteWithOctave(targetMidi + 2, preferFlats);
                notesInBar = [
                    { note: n1, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: pickScaleNote(spec.r1, scale1, 2, 5), dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: nApp, dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "ind_2" },
                    { note: targetNote, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: pickScaleNote(r2, scale2, 0, 5), dur: "q", isWeakBeat: false, pOrS: "P" }
                ];
            } else if (styleMode === 'tonicization' || contourType === 3) {
                const n1 = pickScaleNote(spec.r1, scale1, 0, 5);
                const n2 = pickScaleNote(spec.r1, scale1, 3, 5);
                const nApp = midiToNoteWithOctave(targetMidi - 1, preferFlats);
                notesInBar = [
                    { note: n1, dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: n2, dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "diatonic" },
                    { note: pickScaleNote(spec.r1, scale1, 4, 5), dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: pickScaleNote(r2, scale2, 1, 5), dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: nApp, dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: "tonic_bII7_I" },
                    { note: targetNote, dur: "q", isWeakBeat: false, pOrS: "P" }
                ];
            } else {
                const defTechMap = { chromatic: 'chromatic_below', parallel: 'parallel', dominant: 'dominant', diatonic: 'diatonic', diminished: 'diminished' };
                const chosenDef = defTechMap[styleMode] || 'chromatic_below';
                const appDelta = chosenDef === 'parallel' ? -2 : -1;
                const n1 = pickScaleNote(spec.r1, scale1, 2, 5);
                const n2 = pickScaleNote(spec.r1, scale1, 4, 5);
                const nApp = midiToNoteWithOctave(targetMidi + appDelta, preferFlats);
                notesInBar = [
                    { note: n1, dur: "q", isWeakBeat: false, pOrS: "P" },
                    { note: n2, dur: "8", isWeakBeat: false, pOrS: "P" },
                    { note: nApp, dur: "8", isWeakBeat: true, pOrS: "S", defaultOpt: chosenDef },
                    { note: targetNote, dur: "h", isWeakBeat: false, pOrS: "P" }
                ];
            }

            const generatedMeasure = {
                bar: b + 1,
                chordRoot: spec.r1,
                chordTypeKey: spec.t1,
                scaleId: spec.s1,
                chordSymbol: '',
                harmonicRhythm: hr,
                notes: notesInBar
            };
            constrainGeneratedMelodyToHarmony(generatedMeasure);

            const c1 = chordStructures[spec.t1];
            const c2 = chordStructures[t2];
            const sym = spec.split === 2
                ? `${displayNote(spec.r1)}${c1.cifrado} - ${displayNote(r2)}${c2.cifrado}`
                : `${displayNote(spec.r1)}${c1.cifrado}`;
            generatedMeasure.chordSymbol = sym;
            measures.push(generatedMeasure);
        }
        const id = 'rnd_' + Date.now();
        state.melodicStudio.customRandomExamples[id] = { id, bars: barsCount, title: `🎲 Aleatoria (${barsCount}C): ` + measures.map(m => m.chordSymbol).join(' | '), measures };
        state.melodicStudio.exampleId = id;
        state.melodicStudio.selectedNoteIdx = 0;
        state.melodicStudio.enharmonicNoteSpellingByNote = {};
        state.melodicStudio.manuallyClearedNotes = {};
        state.melodicStudio.selectedHarmonizationByNote = {};
        state.melodicStudio.autoFilledPhraseVoicings = {};
        state.melodicStudio.voicingDispositionByNote = {};
        populateMelodicStudioExamplesDropdown();
        renderMelodicStudioUI();
    }

    function populateMelodicStudioExamplesDropdown() {
        const sel = el('melodicExampleSelect');
        if (!sel) return;
        const allEx = { ...MELODIC_ANALYSIS_EXAMPLES, ...(state.melodicStudio.customRandomExamples || {}) };
        sel.replaceChildren(...Object.values(allEx).map(ex => new Option(ex.title, ex.id)));
        sel.value = state.melodicStudio.exampleId;
    }

    function generateStandAloneExercise() {
        state.studioHarmonicBlockVisible = false;
        if (state.continuityMode) {
            if (!state.continuity.measures.length) generateContinuity8Bars();
            else loadContinuityBar((state.continuity.currentBar + 1) % 8);
            return;
        }
        state.isCustomChallenge = false;
        state.failedCurrentExercise = false;
        state.timer.exerciseStartTime = Date.now();

        if (state.errorReviewMode && state.stats.errorBank && state.stats.errorBank.length > 0) {
            const errItem = state.stats.errorBank[Math.floor(Math.random() * state.stats.errorBank.length)];
            const built = buildCloseVoicingForChordAndLead(errItem.root, errItem.chordTypeKey, errItem.leadLabel);
            const disp = applyDispositionToCloseVoicing(errItem.root, errItem.chordTypeKey, errItem.leadLabel, built.labels, built.notesWithOct, state.voicingType);
            state.chordRoot = errItem.root;
            state.chordTypeKey = errItem.chordTypeKey;
            state.givenLabel = errItem.leadLabel;
            state.givenNoteWithOctave = disp.notesWithOct[0];
            state.givenNote = disp.notesWithOct[0].split('/')[0];
            state.orderedLabelsForDisplay = [...disp.labels];
            state.correctNotesWithOctave = [...disp.notesWithOct];
            state.correctNotes = disp.notesWithOct.map(x => x.split('/')[0]);
            state.selectedUserNotes = [state.givenNoteWithOctave];
            state.validatedCells = [null, null, null, null, null];
            state.editingCellIndex = null;
            state.exerciseSolved = false;
            showFeedbackBanner('');
            updateDisplay();
            return;
        }

        let cKey;
        if (state.forcedChordTypeKey && state.forcedChordTypeKey !== 'auto' && chordStructures[state.forcedChordTypeKey]) {
            if (state.difficulty === 'basic' && chordStructures[state.forcedChordTypeKey].difficulty !== 'basic') {
                cKey = 'major';
            } else {
                cKey = state.forcedChordTypeKey;
            }
        } else {
            let relevant = Object.keys(chordStructures).filter(k =>
                state.difficulty === 'basic'
                    ? chordStructures[k].difficulty === 'basic'
                    : chordStructures[k].difficulty === 'intermediate'
            );
            const customCfg = state.customPractice[state.difficulty];
            if (customCfg && customCfg.isActive && customCfg.allowedChords && customCfg.allowedChords.length) {
                const filtered = relevant.filter(k => customCfg.allowedChords.includes(k));
                if (filtered.length) relevant = filtered;
            }
            cKey = relevant[Math.floor(Math.random() * relevant.length)] || (state.difficulty === 'basic' ? 'major' : 'maj7');
        }
        const root = allRoots[Math.floor(Math.random() * allRoots.length)];
        const allLeads = Object.keys(chordStructures[cKey].voicing_rules);
        const practiceCfg = state.customPractice[state.difficulty];
        const basicLeads = allLeads.filter(label => PRACTICE_LEAD_LABELS.includes(label));
        const leads = state.difficulty === 'advanced'
            ? allLeads.filter(label =>
                !ADVANCED_TENSION_LEADS.includes(label) ||
                !practiceCfg?.isActive ||
                !practiceCfg.allowedLeads?.length ||
                practiceCfg.allowedLeads.includes(label)
            )
            : basicLeads.filter(label =>
                !practiceCfg?.isActive ||
                !practiceCfg.allowedLeads?.length ||
                practiceCfg.allowedLeads.includes(label)
            );
        const lead = leads[Math.floor(Math.random() * leads.length)] || allLeads[0];

        const activeVoicing = state.difficulty === 'basic' ? 'close' : state.voicingType;
        const built = buildCloseVoicingForChordAndLead(root, cKey, lead);
        const disp = applyDispositionToCloseVoicing(root, cKey, lead, built.labels, built.notesWithOct, activeVoicing);
        if (state.includeBass && state.difficulty !== 'basic' && disp.notesWithOct.length <= 4) {
            const lowM = getNoteWithOctaveMidi(disp.notesWithOct[disp.notesWithOct.length - 1]);
            const bassNote = getImplicitBassWithOctave(root, lowM);
            disp.notesWithOct.push(bassNote);
            disp.labels.push('1 (Bajo)');
        }

        state.chordRoot = root;
        state.chordTypeKey = cKey;
        state.givenLabel = lead;
        state.givenNoteWithOctave = disp.notesWithOct[0];
        state.givenNote = disp.notesWithOct[0].split('/')[0];
        state.orderedLabelsForDisplay = [...disp.labels];
        state.correctNotesWithOctave = [...disp.notesWithOct];
        state.correctNotes = disp.notesWithOct.map(x => x.split('/')[0]);
        state.selectedUserNotes = [state.givenNoteWithOctave];
        state.validatedCells = [null, null, null, null, null];
        state.editingCellIndex = null;
        state.exerciseSolved = false;
        showFeedbackBanner('');
        updateDisplay();
    }

    // Editor de Melodía Propia (Compases Simples 2, 3, 4 / 2, 4, 8 y Completado de Compás)
    function getCustomEditorMaxQuarterBeats() {
        const draft = state.melodicStudio.customEditorDraft;
        const num = parseInt(draft?.timeSigNum, 10) || 4;
        const den = parseInt(draft?.timeSigDen, 10) || 4;
        return num * (4 / den);
    }

    function fillRemainingBeatsInEditorBar(barObj, maxQuarterBeats, useChordNote = false) {
        if (!barObj) return;
        const durCatalog = [
            { dur: 'w', qBeats: 4 },
            { dur: 'h', qBeats: 2 },
            { dur: 'q', qBeats: 1 },
            { dur: '8', qBeats: 0.5 },
            { dur: '16', qBeats: 0.25 }
        ];
        let used = barObj.notes.reduce((s, n) => s + getBeatsForDuration(n.dur), 0);
        let rem = +(maxQuarterBeats - used).toFixed(4);
        const defaultPitch = calculateNoteName(barObj.chord1Root || 'C', { semitones: 4, degreeOffset: 2 }) + '/5';
        let guard = 0;
        while (rem >= 0.24 && guard < 32) {
            guard++;
            const fit = durCatalog.find(d => d.qBeats <= rem + 0.001) || durCatalog[durCatalog.length - 1];
            if (useChordNote && barObj.notes.length === 0) {
                barObj.notes.push({ note: defaultPitch, dur: fit.dur, isRest: false });
            } else {
                barObj.notes.push({ note: 'B/4', dur: fit.dur, isRest: true });
            }
            used = barObj.notes.reduce((s, n) => s + getBeatsForDuration(n.dur), 0);
            rem = +(maxQuarterBeats - used).toFixed(4);
        }
    }

    function initCustomMelodyDraft(barsCount = 4, timeSigNum = 4, timeSigDen = 4) {
        const defChords = [
            { r1: 'C', t1: 'maj7', r2: 'A', t2: '7', split: 1 },
            { r1: 'A', t1: '7', r2: 'D', t2: 'm7', split: 1 },
            { r1: 'D', t1: 'm7', r2: 'G', t2: '7', split: 1 },
            { r1: 'G', t1: '7', r2: 'C', t2: 'maj7', split: 2 }
        ];
        const measures = [];
        for (let i = 0; i < barsCount; i++) {
            const d = defChords[i % defChords.length];
            measures.push({ bar: i + 1, splitCount: d.split, chord1Root: d.r1, chord1Type: d.t1, chord2Root: d.r2, chord2Type: d.t2, notes: [] });
        }
        state.melodicStudio.customEditorDraft = { barsCount, timeSigNum, timeSigDen, activeBarIdx: 0, activeNoteIdx: -1, noteHitBoxes: [], measures };
    }

    function drawCustomMelodyLivePreview() {
        try {
            const canvas = el('customMelodyLiveCanvas');
            const VF = window.Vex ? window.Vex.Flow : null;
            if (!canvas || !VF || !VF.Renderer) return;
            const { Renderer, Stave, StaveNote, GhostNote, Voice, Formatter, Accidental, StaveConnector } = VF;
            const draft = state.melodicStudio.customEditorDraft;
            const curBar = draft.measures[draft.activeBarIdx] || draft.measures[0];
            const num = parseInt(draft.timeSigNum, 10) || 4;
            const den = parseInt(draft.timeSigDen, 10) || 4;
            const timeSigStr = `${num}/${den}`;
            const maxQ = getCustomEditorMaxQuarterBeats();
            const usedQ = curBar.notes.reduce((s, n) => s + getBeatsForDuration(n.dur), 0);
            const isBarComplete = Math.abs(maxQ - usedQ) < 0.01;

            if (draft.activeNoteIdx >= curBar.notes.length) draft.activeNoteIdx = curBar.notes.length - 1;
            if (draft.activeNoteIdx < 0 && curBar.notes.length > 0) draft.activeNoteIdx = curBar.notes.length - 1;

            if (el('customActiveNoteStatusBadge')) {
                if (curBar.notes.length && draft.activeNoteIdx >= 0 && curBar.notes[draft.activeNoteIdx]) {
                    const an = curBar.notes[draft.activeNoteIdx];
                    el('customActiveNoteStatusBadge').textContent = `C${draft.activeBarIdx + 1} (${timeSigStr}) • Nota ${draft.activeNoteIdx + 1}/${curBar.notes.length}: ${an.isRest ? '𝄽 Silencio' : formatScientificPitch(an.note)} (${an.dur}) ${isBarComplete ? '✅ Completo' : '⏳ Incompleto'}`;
                } else {
                    el('customActiveNoteStatusBadge').textContent = `C${draft.activeBarIdx + 1} (${timeSigStr}) vacío`;
                }
            }

            const width = 560, height = 225;
            const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
            renderer.resize(width, height);
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.fillStyle = '#0f172a';
            context.strokeStyle = '#0f172a';
            const ctx = renderer.getContext();

            const trebleStave = new Stave(24, 28, width - 38);
            const bassStave = new Stave(24, 118, width - 38);
            trebleStave.addClef("treble").addTimeSignature(timeSigStr).setContext(ctx).draw();
            bassStave.addClef("bass").addTimeSignature(timeSigStr).setContext(ctx).draw();
            if (StaveConnector) {
                new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
                new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
            }

            const c1Sym = displayNote(curBar.chord1Root) + (chordStructures[curBar.chord1Type]?.cifrado || '');
            const c2Sym = displayNote(curBar.chord2Root) + (chordStructures[curBar.chord2Type]?.cifrado || '');
            context.font = '800 13px "Plus Jakarta Sans", Georgia, serif';
            context.fillText(c1Sym, 82, 18);
            if (curBar.splitCount === 2) context.fillText(c2Sym, 310, 18);

            if (!curBar.notes.length) return;
            const activeAccidentalsInEditorBar = Object.create(null);
            const tNotes = [], bNotes = [];
            const editorTupletsToDraw = [];
            const editorTupletCanvasGroups = [];
            let curEdTuplet = [];
            let curEdTupletMeta = [];

            const applyDotsToAllKeysEditor = (staveNoteObj, keysCount) => {
                if (!staveNoteObj || !VF.Dot) return;
                for (let k = 0; k < keysCount; k++) {
                    try {
                        staveNoteObj.addModifier(new VF.Dot(), k);
                    } catch (e) {}
                }
            };

            curBar.notes.forEach((n, nIdx) => {
                const isSel = nIdx === draft.activeNoteIdx;
                const noteColor = isSel ? '#2563eb' : '#0f172a';
                const isTuplet = n.dur.endsWith('t');
                const isDotted = n.dur.endsWith('d');
                const vfDur = isTuplet ? n.dur.replace('t', '') : (isDotted ? n.dur.replace('d', '') : n.dur);
                const durForSn = isDotted ? (vfDur + 'd') : vfDur;

                if (n.isRest) {
                    const rSn = new StaveNote({ keys: ["b/4"], duration: durForSn + "r", clef: "treble" });
                    if (isDotted) applyDotsToAllKeysEditor(rSn, 1);
                    tNotes.push(rSn);
                    bNotes.push(GhostNote ? new GhostNote({ duration: durForSn }) : new StaveNote({ keys: ["d/3"], duration: durForSn + "r", clef: "bass" }));
                } else {
                    const inTreble = getNoteWithOctaveMidi(n.note) >= 60;
                    const sn = new StaveNote({ keys: [n.note], duration: durForSn, clef: inTreble ? "treble" : "bass" });
                    const [np] = n.note.split('/');
                    const acc = np.substring(1);
                    if (shouldShowMeasureAccidental(activeAccidentalsInEditorBar, n.note)) {
                        sn.addModifier(new Accidental(acc === '' ? 'n' : acc), 0);
                    }
                    if (isDotted) applyDotsToAllKeysEditor(sn, 1);
                    sn.setKeyStyle(0, { fillStyle: noteColor, strokeStyle: noteColor });
                    if (inTreble) {
                        tNotes.push(sn);
                        bNotes.push(GhostNote ? new GhostNote({ duration: durForSn }) : new StaveNote({ keys: ["d/3"], duration: durForSn + "r", clef: "bass" }));
                    } else {
                        bNotes.push(sn);
                        tNotes.push(GhostNote ? new GhostNote({ duration: durForSn }) : new StaveNote({ keys: ["b/4"], duration: durForSn + "r", clef: "treble" }));
                    }
                    if (isTuplet) {
                        curEdTuplet.push(sn);
                        curEdTupletMeta.push(sn);
                        if (curEdTuplet.length === 3) {
                            if (VF.Tuplet) {
                                try {
                                    editorTupletsToDraw.push(new VF.Tuplet(curEdTuplet, {
                                        num_notes: 3,
                                        notes_occupied: 2,
                                        location: VF.Tuplet.LOCATION_TOP,
                                        bracketed: true,
                                        ratioed: false
                                    }));
                                } catch (e) {}
                            }
                            editorTupletCanvasGroups.push([...curEdTupletMeta]);
                            curEdTuplet = [];
                            curEdTupletMeta = [];
                        }
                    } else {
                        if (curEdTupletMeta.length > 0) {
                            editorTupletCanvasGroups.push([...curEdTupletMeta]);
                        }
                        curEdTuplet = [];
                        curEdTupletMeta = [];
                    }
                }
            });
            if (curEdTupletMeta.length > 0) {
                editorTupletCanvasGroups.push([...curEdTupletMeta]);
                curEdTuplet = [];
                curEdTupletMeta = [];
            }
            const vt = new Voice({ num_beats: num, beat_value: den }).setStrict(false).addTickables(tNotes);
            const vb = new Voice({ num_beats: num, beat_value: den }).setStrict(false).addTickables(bNotes);
            new Formatter().joinVoices([vt, vb]).format([vt, vb], width - 115);
            vt.draw(ctx, trebleStave);
            vb.draw(ctx, bassStave);

            // Corchete con numeral 3 visible para tresillos en el editor (sin duplicados)
            editorTupletCanvasGroups.forEach(grp => {
                if (!grp || !grp.length) return;
                const firstSn = grp[0];
                const lastSn = grp[grp.length - 1];
                if (!firstSn || !lastSn) return;
                const x1 = (typeof firstSn.getAbsoluteX === 'function') ? firstSn.getAbsoluteX() - 4 : 24;
                const x2 = (typeof lastSn.getAbsoluteX === 'function') ? lastSn.getAbsoluteX() + 14 : (x1 + 35);
                let minStemY = 28 + 15;
                grp.forEach(noteObj => {
                    if (noteObj && typeof noteObj.getYs === 'function') {
                        const ys = noteObj.getYs();
                        if (ys && ys.length) minStemY = Math.min(minStemY, ...ys);
                    }
                    if (noteObj && typeof noteObj.getStemExtents === 'function') {
                        const ext = noteObj.getStemExtents();
                        if (ext && ext.topY !== undefined) minStemY = Math.min(minStemY, ext.topY);
                    }
                });
                const bracketY = Math.min(28 - 10, minStemY - 14);
                const midX = (x1 + x2) / 2;
                const numText = '3';
                context.save();
                context.font = '800 12.5px "Plus Jakarta Sans", Georgia, serif';
                const textW = context.measureText(numText).width;
                const gap = (textW / 2) + 5;

                // Pastilla protectora blanca para lectura clara del número 3
                context.fillStyle = '#ffffff';
                context.fillRect(midX - gap + 1, bracketY - 8, (gap - 1) * 2, 16);

                context.strokeStyle = '#0f172a';
                context.fillStyle = '#0f172a';
                context.lineWidth = 1.5;
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.beginPath();
                context.moveTo(x1, bracketY + 5);
                context.lineTo(x1, bracketY);
                context.lineTo(midX - gap, bracketY);
                context.stroke();
                context.beginPath();
                context.moveTo(midX + gap, bracketY);
                context.lineTo(x2, bracketY);
                context.lineTo(x2, bracketY + 5);
                context.stroke();
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(numText, midX, bracketY);
                context.restore();
            });

            if (draft.activeNoteIdx >= 0 && tNotes[draft.activeNoteIdx]) {
                const activeSn = (curBar.notes[draft.activeNoteIdx] && !curBar.notes[draft.activeNoteIdx].isRest && getNoteWithOctaveMidi(curBar.notes[draft.activeNoteIdx].note) < 60)
                    ? bNotes[draft.activeNoteIdx]
                    : tNotes[draft.activeNoteIdx];
                if (activeSn && typeof activeSn.getAbsoluteX === 'function') {
                    const ax = activeSn.getAbsoluteX();
                    context.save();
                    context.fillStyle = 'rgba(37, 99, 235, 0.12)';
                    context.strokeStyle = '#2563eb';
                    context.fillRect(ax - 6, 22, 26, 170);
                    context.strokeRect(ax - 6, 22, 26, 170);
                    context.restore();
                }
            }
        } catch (e) {}
    }

    // Navegación por flechas (notas y compases) y cambio de octava en Crear Melodía
    function navigateCustomEditorNotes(dir) {
        const draft = state.melodicStudio.customEditorDraft;
        if (!draft || !draft.measures.length) return;
        const curBar = draft.measures[draft.activeBarIdx];
        if (!curBar) return;
        if (dir > 0) {
            if (draft.activeNoteIdx < curBar.notes.length - 1) {
                draft.activeNoteIdx++;
            } else if (draft.activeBarIdx < draft.measures.length - 1) {
                draft.activeBarIdx++;
                draft.activeNoteIdx = 0;
            }
        } else {
            if (draft.activeNoteIdx > 0) {
                draft.activeNoteIdx--;
            } else if (draft.activeBarIdx > 0) {
                draft.activeBarIdx--;
                const prevBar = draft.measures[draft.activeBarIdx];
                draft.activeNoteIdx = Math.max(0, (prevBar?.notes.length || 1) - 1);
            }
        }
        const activeBar = draft.measures[draft.activeBarIdx];
        const activeN = activeBar?.notes[draft.activeNoteIdx];
        if (activeN && !activeN.isRest) triggerUpperVoiceNotes([activeN.note], "8n");
        renderCustomMelodyEditorUI();
    }

    function shiftNoteOctave(noteStr, deltaOct) {
        if (!noteStr || !noteStr.includes('/')) return noteStr;
        const [name, octStr] = noteStr.split('/');
        const oct = parseInt(octStr, 10) || 5;
        const newOct = Math.max(3, Math.min(6, oct + deltaOct));
        return `${name}/${newOct}`;
    }

    function shiftNoteChromatic(noteStr, delta, chordRoot = 'C') {
        if (!noteStr || !noteStr.includes('/')) return noteStr;
        const curMidi = getNoteWithOctaveMidi(noteStr);
        const newMidi = Math.max(48, Math.min(88, curMidi + delta));
        const isFlatKey = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(chordRoot) || chordRoot.includes('b');
        const preferFlats = isFlatKey ? true : (delta < 0);
        return midiToNoteWithOctave(newMidi, preferFlats);
    }

    function shiftNoteDiatonic(noteStr, delta, chordRoot = 'C', chordTypeKey = 'maj7', scaleId = null) {
        if (!noteStr || !noteStr.includes('/')) return noteStr;
        const scale = getChordScaleIntervals(chordTypeKey, scaleId);
        let scaleNotes = [];
        if (scale && scale.length) {
            scaleNotes = scale.map(intObj => calculateNoteName(chordRoot, intObj));
        }
        if (!scaleNotes.length) {
            scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        }

        const scalePitches = [];
        for (let oct = 3; oct <= 6; oct++) {
            for (const sName of scaleNotes) {
                const full = `${sName}/${oct}`;
                const midi = getNoteWithOctaveMidi(full);
                if (midi >= 48 && midi <= 88) {
                    scalePitches.push({ note: full, midi });
                }
            }
        }
        scalePitches.sort((a, b) => a.midi - b.midi);
        const uniquePitches = scalePitches.filter((p, i, arr) => i === 0 || p.midi !== arr[i - 1].midi);

        const curMidi = getNoteWithOctaveMidi(noteStr);
        if (delta > 0) {
            const next = uniquePitches.find(p => p.midi > curMidi);
            return next ? next.note : noteStr;
        } else {
            const prev = [...uniquePitches].reverse().find(p => p.midi < curMidi);
            return prev ? prev.note : noteStr;
        }
    }

    function shiftStudioSelectedNote(type, delta) {
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const cur = notesList[selIdx];
        if (!cur || !ex) return;
        const curMeasure = ex.measures[cur.measureIdx];
        if (!curMeasure) return;
        const rawNote = curMeasure.notes[cur.noteIdxInMeasure];
        if (!rawNote) return;

        pushStudioUndoState();

        if (rawNote.isRest) {
            rawNote.isRest = false;
            rawNote.note = 'E/5';
        }

        const hr = getActiveChordForMeasureBeat(curMeasure, cur.startBeatInBar);
        const root = hr.root || cur.barChordRoot || 'C';
        const typeKey = hr.type || cur.barChordTypeKey || 'maj7';
        const scId = hr.scaleId || cur.barScaleId || null;

        let newNoteStr = rawNote.note;
        if (type === 'octave') {
            newNoteStr = shiftNoteOctave(rawNote.note, delta);
        } else if (type === 'chromatic') {
            newNoteStr = shiftNoteChromatic(rawNote.note, delta, root);
        } else if (type === 'diatonic') {
            newNoteStr = shiftNoteDiatonic(rawNote.note, delta, root, typeKey, scId);
        }

        rawNote.note = newNoteStr;
        const [np, oc] = newNoteStr.split('/');
        if (el('liveEditPitchSelect')) el('liveEditPitchSelect').value = np;
        if (el('liveEditOctaveSelect')) {
            el('liveEditOctaveSelect').disabled = false;
            el('liveEditOctaveSelect').value = oc;
        }

        delete state.melodicStudio.enharmonicNoteSpellingByNote[selIdx];
        delete state.melodicStudio.selectedClassificationByNote[selIdx];
        delete state.melodicStudio.selectedHarmonizationByNote[selIdx];
        delete state.melodicStudio.manuallyClearedNotes[selIdx];
        delete rawNote.groupType;
        delete rawNote.defaultOpt;

        state.melodicStudio.autoFilledPhraseVoicings = {};
        renderMelodicStudioUI();
        triggerUpperVoiceNotes([rawNote.note], "8n");

        const modeLabels = {
            octave: 'Octava',
            chromatic: 'Cromático (semitono)',
            diatonic: 'Diatónico (escala)'
        };
        showFeedbackBanner(`🎶 ${modeLabels[type]}: <strong>${formatScientificPitch(rawNote.note)}</strong> (${rawNote.dur}).`, 'info');
    }

    function shiftSelectedMelodicNotePitch(delta) {
        shiftStudioSelectedNote('diatonic', delta);
    }

    function shiftCustomEditorNote(type, delta) {
        const draft = state.melodicStudio.customEditorDraft;
        if (!draft || !draft.measures.length) return;
        const curBar = draft.measures[draft.activeBarIdx];
        if (!curBar || !curBar.notes.length) return;
        if (draft.activeNoteIdx < 0 || draft.activeNoteIdx >= curBar.notes.length) {
            draft.activeNoteIdx = curBar.notes.length - 1;
        }
        const targetNote = curBar.notes[draft.activeNoteIdx];
        if (!targetNote) return;
        if (targetNote.isRest) {
            targetNote.isRest = false;
            targetNote.note = 'E/5';
        }

        const root = curBar.chord1Root || 'C';
        const typeKey = curBar.chord1Type || 'maj7';

        let newNoteStr = targetNote.note;
        if (type === 'octave') {
            newNoteStr = shiftNoteOctave(targetNote.note, delta);
        } else if (type === 'chromatic') {
            newNoteStr = shiftNoteChromatic(targetNote.note, delta, root);
        } else if (type === 'diatonic') {
            newNoteStr = shiftNoteDiatonic(targetNote.note, delta, root, typeKey);
        }

        targetNote.note = newNoteStr;
        const [, oc] = newNoteStr.split('/');
        if (el('customNoteOctSelect')) el('customNoteOctSelect').value = oc;

        triggerUpperVoiceNotes([targetNote.note], "8n");
        renderCustomMelodyEditorUI();
    }

    function shiftCustomEditorNoteOctave(deltaOct) {
        shiftCustomEditorNote('octave', deltaOct);
    }

    // Exportador de la partitura y armonización a archivo estándar MIDI (.mid)
    function exportStudioScoreToMidi() {
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        const flatNotes = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        if (!ex || !flatNotes.length) return;

        const bpm = state.melodicStudio.tempoBpm || 105;
        const ticksPerQuarter = 480;
        const usPerQuarter = Math.round(60000000 / bpm);

        const events = [];
        let phraseBeatCursor = 0;

        flatNotes.forEach((fn, idx) => {
            const durationBeats = getBeatsForDuration(fn.dur);
            const startTick = Math.round(phraseBeatCursor * ticksPerQuarter);
            const durTicks = Math.max(1, Math.round(durationBeats * ticksPerQuarter) - 10);
            const endTick = startTick + durTicks;

            if (!fn.isRest) {
                const comp = state.melodicStudio.autoFilledPhraseVoicings[idx];
                const showChord = state.melodicStudio.showFullVoicingInScore && comp && comp.notesWithOct && comp.notesWithOct.length;
                const notesToPlay = showChord ? [...comp.notesWithOct] : [fn.note];
                if (showChord && comp.implicitBassNote) {
                    notesToPlay.push(comp.implicitBassNote);
                }
                notesToPlay.forEach(nStr => {
                    const midiVal = Math.max(0, Math.min(127, getNoteWithOctaveMidi(nStr)));
                    events.push({ tick: startTick, type: 0x90, note: midiVal, vel: 85 });
                    events.push({ tick: endTick, type: 0x80, note: midiVal, vel: 0 });
                });
            }
            phraseBeatCursor += durationBeats;
        });

        events.sort((a, b) => a.tick - b.tick || a.type - b.type);

        const writeVarLen = (val) => {
            let buffer = val & 0x7F;
            const bytes = [];
            while ((val >>= 7)) {
                buffer <<= 8;
                buffer |= ((val & 0x7F) | 0x80);
            }
            while (true) {
                bytes.push(buffer & 0xFF);
                if (buffer & 0x80) buffer >>= 8;
                else break;
            }
            return bytes;
        };

        const trackBytes = [];
        trackBytes.push(0x00, 0xFF, 0x51, 0x03, (usPerQuarter >> 16) & 0xFF, (usPerQuarter >> 8) & 0xFF, usPerQuarter & 0xFF);
        trackBytes.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

        let lastTick = 0;
        events.forEach(ev => {
            const delta = Math.max(0, ev.tick - lastTick);
            lastTick = ev.tick;
            trackBytes.push(...writeVarLen(delta));
            trackBytes.push(ev.type, ev.note, ev.vel);
        });

        trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

        const trackLen = trackBytes.length;
        const midiData = [
            0x4D, 0x54, 0x68, 0x64,
            0x00, 0x00, 0x00, 0x06,
            0x00, 0x00,
            0x00, 0x01,
            (ticksPerQuarter >> 8) & 0xFF, ticksPerQuarter & 0xFF,
            0x4D, 0x54, 0x72, 0x6B,
            (trackLen >> 24) & 0xFF,
            (trackLen >> 16) & 0xFF,
            (trackLen >> 8) & 0xFF,
            trackLen & 0xFF,
            ...trackBytes
        ];

        const blob = new Blob([new Uint8Array(midiData)], { type: 'audio/midi' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `armonizacion_${state.melodicStudio.exampleId || 'estudio'}.mid`;
        a.click();
        showFeedbackBanner('🎹 Archivo MIDI (.mid) exportado exitosamente.', 'success');
    }

    // Exportador universal de la partitura del Estudio a formato MusicXML (.musicxml)
    function exportStudioScoreToMusicXML() {
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        const flatNotes = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        if (!ex || !flatNotes.length) return;
        const durMapXml = {
            'w': { div: 48, type: 'whole' },
            'hd': { div: 36, type: 'half', dot: true },
            'h': { div: 24, type: 'half' },
            'qd': { div: 18, type: 'quarter', dot: true },
            'q': { div: 12, type: 'quarter' },
            'qt': { div: 8, type: 'quarter', tuplet: true },
            '8d': { div: 9, type: 'eighth', dot: true },
            '8': { div: 6, type: 'eighth' },
            '8t': { div: 4, type: 'eighth', tuplet: true },
            '16': { div: 3, type: '16th' },
            '16t': { div: 2, type: '16th', tuplet: true }
        };
        const parsePitchXml = (nWithOct) => {
            const [np, oct] = (nWithOct || 'C/5').split('/');
            const step = np.charAt(0).toUpperCase();
            const acc = np.substring(1);
            const alter = acc === '#' ? 1 : (acc === 'b' ? -1 : (acc === '##' ? 2 : (acc === 'bb' ? -2 : 0)));
            return { step, alter, octave: parseInt(oct, 10) || 5 };
        };
        let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="4.0">\n  <work><work-title>${(ex.title || 'Armonizacion Bloque Armonico Pro').replace(/[<>&"]/g, '')}</work-title></work>\n  <identification><creator type="composer">Bloque Armonico Pro - Juan Miguel Rios Redondo</creator></identification>\n  <part-list><score-part id="P1"><part-name>Piano / Seccion 4-Way Close</part-name></score-part></part-list>\n  <part id="P1">\n`;

        let cursor = 0;
        ex.measures.forEach((m, mIdx) => {
            xml += `    <measure number="${mIdx + 1}">\n`;
            if (mIdx === 0) {
                xml += `      <attributes>\n        <divisions>12</divisions>\n        <key><fifths>0</fifths></key>\n        <time><beats>4</beats><beat-type>4</beat-type></time>\n        <staves>2</staves>\n        <clef number="1"><sign>G</sign><line>2</line></clef>\n        <clef number="2"><sign>F</sign><line>4</line></clef>\n      </attributes>\n`;
            }
            const hr = m.harmonicRhythm || [{ root: m.chordRoot, type: m.chordTypeKey, startBeat: 0, durationBeats: 4 }];
            m.notes.forEach((rawN) => {
                const fn = flatNotes[cursor];
                const dSpec = durMapXml[fn.dur] || durMapXml['q'];
                const matchingSeg = hr.find(s => Math.abs(fn.startBeatInBar - s.startBeat) < 0.05);
                if (matchingSeg) {
                    const rPitch = parsePitchXml(matchingSeg.root + '/4');
                    const kindMap = { maj7: 'major-seventh', major: 'major', m7: 'minor-seventh', minor: 'minor', '7': 'dominant', m7b5: 'half-diminished', dim7: 'diminished-seventh' };
                    xml += `      <harmony><root><root-step>${rPitch.step}</root-step>${rPitch.alter ? `<root-alter>${rPitch.alter}</root-alter>` : ''}</root><kind>${kindMap[matchingSeg.type] || 'major-seventh'}</kind></harmony>\n`;
                }
                const tupletXml = dSpec.tuplet ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : '';
                const dotXml = dSpec.dot ? '<dot/>' : '';
                if (fn.isRest) {
                    xml += `      <note><rest/><duration>${dSpec.div}</duration><voice>1</voice><type>${dSpec.type}</type>${dotXml}${tupletXml}<staff>1</staff></note>\n`;
                } else {
                    const comp = state.melodicStudio.autoFilledPhraseVoicings[cursor];
                    const cl = fn.activeClassObj || fn.classifications[0];
                    const tId = comp?.techniqueId || state.melodicStudio.selectedHarmonizationByNote[cursor] || cl.defaultOpt || 'principal_4way';
                    const abbr = HARMONIZATION_TECHNIQUES_CATALOG[tId]?.abbr || '4-WC';
                    const keys = (state.melodicStudio.showFullVoicingInScore && comp?.notesWithOct?.length) ? comp.notesWithOct : [fn.note];
                    keys.forEach((kStr, kIdx) => {
                        const p = parsePitchXml(kStr);
                        const staffNum = getNoteWithOctaveMidi(kStr) < 60 ? 2 : 1;
                        xml += `      <note>\n`;
                        if (kIdx > 0) xml += `        <chord/>\n`;
                        xml += `        <pitch><step>${p.step}</step>${p.alter ? `<alter>${p.alter}</alter>` : ''}<octave>${p.octave}</octave></pitch>\n        <duration>${dSpec.div}</duration><voice>1</voice><type>${dSpec.type}</type>${dotXml}${tupletXml}<staff>${staffNum}</staff>\n`;
                        if (kIdx === 0) {
                            xml += `        <lyric number="1"><syllabic>single</syllabic><text>${cl.shortTag}:${abbr}</text></lyric>\n`;
                        }
                        xml += `      </note>\n`;
                    });
                }
                cursor++;
            });
            xml += `    </measure>\n`;
        });
        xml += `  </part>\n</score-partwise>\n`;
        const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `armonizacion_${state.melodicStudio.exampleId || 'estudio'}.musicxml`;
        a.click();
        showFeedbackBanner('🎼 Partitura exportada en formato universal MusicXML (.musicxml).', 'success');
    }

    // Construye el Reporte Completo de Gamificación y Evaluación al Terminar Sesión
    function buildFullGamifiedSessionReportHTML(isEndSession = true) {
        const sess = state.currentSession;
        const totCorrect = isEndSession ? (sess.correct || 0) : (state.stats.totalCorrect || 0);
        const totIncorrect = isEndSession ? (sess.incorrect || 0) : (state.stats.totalIncorrect || 0);
        const tot = totCorrect + totIncorrect;
        const acc = tot > 0 ? Math.round((totCorrect / tot) * 100) : 100;
        const avgSpeed = sess.timedCount > 0 ? (sess.totalTimeSec / sess.timedCount).toFixed(1) + 's' : '4.5s';

        const totalXp = state.stats.xp || 0;
        const level = Math.floor(totalXp / 100) + 1;
        const xpInLevel = totalXp % 100;
        const rankTitles = ['Aprendiz de Bloque', 'Estudiante de 4-Way Close', 'Intérprete de Jazz', 'Arreglista de Sección', 'Maestro de Big Band'];
        const rankName = rankTitles[Math.min(rankTitles.length - 1, level - 1)];

        const starsCount = acc >= 90 ? 5 : (acc >= 75 ? 4 : (acc >= 60 ? 3 : (acc >= 40 ? 2 : 1)));
        const starsStr = '⭐'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

        const unl = state.stats.unlockedBadges || [];
        const badgesHtml = BADGES_CATALOG.map(b => {
            const isUnl = unl.includes(b.id);
            return `<div class="p-2 rounded-lg border flex items-center gap-2 text-xs ${isUnl ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold' : 'opacity-40 bg-slate-100'}">
                <span class="text-xl">${b.icon}</span>
                <div><div>${b.title}</div><div class="text-[10px] opacity-80">${b.desc}</div></div>
            </div>`;
        }).join('');

        const comp = state.stats.competencies || {};
        const fmtC = (o) => o && o.total > 0 ? `${Math.round((o.correct / o.total) * 100)}% (${o.correct}/${o.total})` : '0/0';

        return `
            <div class="space-y-3 text-xs">
                <div class="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div class="text-[11px] uppercase font-bold opacity-85">👤 Estudiante: ${escapeHtml(state.currentUser)} • Nivel ${level} (${rankName})</div>
                        <div class="text-lg font-extrabold">Calificación de la Sesión: ${starsStr} (${acc}% Precisión)</div>
                    </div>
                    <div class="text-right font-mono">
                        <div class="text-sm font-extrabold">✨ +${sess.xpEarned || 0} XP en sesión (Total: ${totalXp} XP)</div>
                        <div class="w-40 h-2 bg-white/30 rounded-full overflow-hidden mt-1">
                            <div class="h-full bg-amber-400" style="width:${xpInLevel}%"></div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300"><div class="text-[10px] font-bold text-emerald-800">Aciertos / Errores</div><div class="text-base font-extrabold text-emerald-700">${totCorrect} ✅ / ${totIncorrect} ❌</div></div>
                    <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-300"><div class="text-[10px] font-bold text-amber-800">🔥 Racha Diaria</div><div class="text-base font-extrabold text-amber-700">${state.stats.dailyStreak || 1} día(s)</div></div>
                    <div class="p-2.5 rounded-xl bg-purple-50 border border-purple-300"><div class="text-[10px] font-bold text-purple-800">⚡ Mejor Racha Sesión</div><div class="text-base font-extrabold text-purple-700">${sess.bestSessionStreak || 0} seguidos</div></div>
                    <div class="p-2.5 rounded-xl bg-sky-50 border border-sky-300"><div class="text-[10px] font-bold text-sky-800">⏱️ Velocidad Prom.</div><div class="text-base font-extrabold text-sky-700">${avgSpeed}</div></div>
                </div>

                <div class="p-3 rounded-xl bg-slate-100 border border-slate-300">
                    <div class="font-extrabold text-indigo-900 uppercase text-[11px] mb-1.5">🎯 Evaluación por Competencias Armónicas:</div>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center">
                        <div class="p-1.5 rounded bg-white border"><div class="text-[10px] text-slate-500">4-Way Close</div><div class="font-extrabold text-indigo-700">${fmtC(comp.close4Way)}</div></div>
                        <div class="p-1.5 rounded bg-white border"><div class="text-[10px] text-slate-500">Drops/Spreads</div><div class="font-extrabold text-teal-700">${fmtC(comp.openDropsSpreads)}</div></div>
                        <div class="p-1.5 rounded bg-white border"><div class="text-[10px] text-slate-500">Armoniz. Melódica</div><div class="font-extrabold text-emerald-700">${fmtC(comp.melodicApproaches)}</div></div>
                        <div class="p-1.5 rounded bg-white border"><div class="text-[10px] text-slate-500">Continuidad 8C</div><div class="font-extrabold text-amber-700">${fmtC(comp.continuity8C)}</div></div>
                        <div class="p-1.5 rounded bg-white border"><div class="text-[10px] text-slate-500">Dictado Auditivo</div><div class="font-extrabold text-pink-700">${fmtC(comp.earDictation)}</div></div>
                    </div>
                </div>

                ${renderLearningCurveChartsSVG()}

                <div>
                    <div class="font-extrabold text-amber-800 uppercase text-[11px] mb-1.5">🏆 Medallas y Logros de Gamificación (${unl.length}/${BADGES_CATALOG.length}):</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">${badgesHtml}</div>
                </div>
            </div>
        `;
    }

    function renderCustomMelodyEditorUI() {
        const draft = state.melodicStudio.customEditorDraft;
        if (!draft.measures.length) initCustomMelodyDraft(4, 4, 4);
        const curBar = draft.measures[draft.activeBarIdx] || draft.measures[0];
        const maxQ = getCustomEditorMaxQuarterBeats();
        const num = parseInt(draft.timeSigNum, 10) || 4;
        const den = parseInt(draft.timeSigDen, 10) || 4;
        const unitFactor = den / 4;

        if (el('customTimeSigNumSelect')) el('customTimeSigNumSelect').value = String(num);
        if (el('customTimeSigDenSelect')) el('customTimeSigDenSelect').value = String(den);

        if (el('customMelodyBarTabs')) {
            el('customMelodyBarTabs').innerHTML = draft.measures.map((m, i) => {
                const bQ = m.notes.reduce((s, x) => s + getBeatsForDuration(x.dur), 0);
                const bUnits = +(bQ * unitFactor).toFixed(2);
                const isComp = Math.abs(maxQ - bQ) < 0.01;
                return `<button type="button" data-btab="${i}" class="toolbar-btn ${i === draft.activeBarIdx ? 'bg-teal-700 text-white' : (isComp ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-white text-slate-800')}">C${i + 1} (${bUnits}/${num}${isComp ? ' ✓' : ''})</button>`;
            }).join('');
            el('customMelodyBarTabs').querySelectorAll('[data-btab]').forEach(btn => btn.addEventListener('click', e => {
                draft.activeBarIdx = parseInt(e.currentTarget.dataset.btab, 10);
                renderCustomMelodyEditorUI();
            }));
        }
        const chordTypes = Object.keys(chordStructures);
        ['customBarChord1Root', 'customBarChord2Root'].forEach(id => {
            const s = el(id);
            if (s && s.options.length !== allRoots.length) s.innerHTML = allRoots.map(r => `<option value="${r}">${displayNote(r)}</option>`).join('');
        });
        ['customBarChord1Type', 'customBarChord2Type'].forEach(id => {
            const s = el(id);
            if (s && s.options.length !== chordTypes.length) {
                s.innerHTML = chordTypes.map(k => {
                    const c = chordStructures[k];
                    const label = c?.cifrado ? `${c.cifrado} (${c.name})` : (c?.name || k);
                    return `<option value="${k}">${label}</option>`;
                }).join('');
            }
        });
        if (el('customBarSplitSelect')) el('customBarSplitSelect').value = String(curBar.splitCount || 1);
        if (el('customBarChord2Wrapper')) el('customBarChord2Wrapper').classList.toggle('hidden', curBar.splitCount !== 2);
        if (el('customBarChord1Root')) el('customBarChord1Root').value = curBar.chord1Root;
        if (el('customBarChord1Type')) el('customBarChord1Type').value = curBar.chord1Type;
        if (el('customBarChord2Root')) el('customBarChord2Root').value = curBar.chord2Root;
        if (el('customBarChord2Type')) el('customBarChord2Type').value = curBar.chord2Type;

        const usedQ = curBar.notes.reduce((s, n) => s + getBeatsForDuration(n.dur), 0);
        const usedUnits = +(usedQ * unitFactor).toFixed(2);
        const isBarComplete = Math.abs(maxQ - usedQ) < 0.01;
        if (el('customEditorBarBeatBadge')) {
            el('customEditorBarBeatBadge').textContent = `${usedUnits} / ${num} T (${num}/${den}) ${isBarComplete ? '✅' : '⏳'}`;
        }

        if (el('customNotePitchButtons')) {
            el('customNotePitchButtons').innerHTML = naturalNotes.map(n => `<button type="button" data-edp="${n}" class="toolbar-btn bg-indigo-600 text-white">+ ${displayNote(n)}</button>`).join('');
            el('customNotePitchButtons').querySelectorAll('[data-edp]').forEach(b => b.addEventListener('click', e => {
                const curUsedQ = curBar.notes.reduce((s, x) => s + getBeatsForDuration(x.dur), 0);
                let remQ = +(maxQ - curUsedQ).toFixed(4);
                if (remQ <= 0.01) {
                    // Si el compás actual ya está lleno, pasar automáticamente al siguiente compás disponible
                    if (draft.activeBarIdx < draft.measures.length - 1) {
                        draft.activeBarIdx++;
                        renderCustomMelodyEditorUI();
                    }
                    return;
                }
                let dur = el('customNoteDurSelect')?.value || 'q';
                const durCatalog = [
                    { dur: 'w', qBeats: 4 },
                    { dur: 'h', qBeats: 2 },
                    { dur: 'q', qBeats: 1 },
                    { dur: '8', qBeats: 0.5 },
                    { dur: '16', qBeats: 0.25 }
                ];
                if (getBeatsForDuration(dur) > remQ + 0.001) {
                    const fitted = durCatalog.find(d => d.qBeats <= remQ + 0.001);
                    if (!fitted) return;
                    dur = fitted.dur;
                }
                const acc = el('customNoteAccSelect')?.value || '';
                const oct = el('customNoteOctSelect')?.value || '5';
                const noteStr = `${e.currentTarget.dataset.edp}${acc}/${oct}`;
                curBar.notes.push({ note: noteStr, dur, isRest: false });
                draft.activeNoteIdx = curBar.notes.length - 1;
                triggerUpperVoiceNotes([noteStr], "8n");
                renderCustomMelodyEditorUI();
            }));
        }
        if (el('customMelodyOverviewList')) {
            el('customMelodyOverviewList').innerHTML = draft.measures.map((m, bIdx) => {
                const notesHtml = m.notes.length
                    ? m.notes.map((n, nIdx) => {
                        const isAct = bIdx === draft.activeBarIdx && nIdx === draft.activeNoteIdx;
                        const lbl = n.isRest ? `𝄽(${n.dur})` : `${formatScientificPitch(n.note)}(${n.dur})`;
                        return `<button type="button" data-ov-bar="${bIdx}" data-ov-note="${nIdx}" class="px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold cursor-pointer ${isAct ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-800 border-slate-300'}">${lbl}</button>`;
                    }).join(' ')
                    : '<span class="text-[10px] italic text-slate-400">Sin notas</span>';
                return `<div class="p-1.5 rounded bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <span class="font-extrabold text-teal-900 shrink-0">Compás ${bIdx + 1}:</span>
                    <div class="flex flex-wrap gap-1 flex-1">${notesHtml}</div>
                </div>`;
            }).join('');
            el('customMelodyOverviewList').querySelectorAll('[data-ov-bar]').forEach(btn => {
                btn.addEventListener('click', e => {
                    draft.activeBarIdx = parseInt(e.currentTarget.dataset.ovBar, 10) || 0;
                    draft.activeNoteIdx = parseInt(e.currentTarget.dataset.ovNote, 10) || 0;
                    const n = draft.measures[draft.activeBarIdx]?.notes[draft.activeNoteIdx];
                    if (n && !n.isRest) triggerUpperVoiceNotes([n.note], "8n");
                    renderCustomMelodyEditorUI();
                });
            });
        }
        drawCustomMelodyLivePreview();
    }

    function stopStudioPhrasePlayback() {
        if (state.melodicStudio.phraseTimers && state.melodicStudio.phraseTimers.length) {
            state.melodicStudio.phraseTimers.forEach(t => clearTimeout(t));
        }
        state.melodicStudio.phraseTimers = [];
        state.melodicStudio.isPlayingPhrase = false;
        el('studioLivePlaybackBanner')?.classList.remove('studio-live-playback-active');
        if (el('playMelodyOnlyBtn')) el('playMelodyOnlyBtn').textContent = '🎵 Solo Melodía';
        if (el('playFullMelodicPhraseBtn')) el('playFullMelodicPhraseBtn').textContent = '▶️ Sonar Frase + Bajo';
        if (el('playFromActiveNoteBtn')) el('playFromActiveNoteBtn').textContent = '⏩ Desde Nota Activa';
        drawMelodicPhraseScore(-1);
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const curNote = notesList[selIdx];
        updateStudioLivePlaybackBanner(curNote, curNote ? state.melodicStudio.autoFilledPhraseVoicings[selIdx] : null, false);
    }

    function stopHarmonizationGroupPreview(button = el('playHarmonizationGroupBtn')) {
        state.melodicStudio.groupPreviewTimers.forEach(timer => clearTimeout(timer));
        state.melodicStudio.groupPreviewTimers = [];
        if (button) button.textContent = '▶ Escuchar conjunto';
    }

    function setStudioTempo(rawTempo) {
        const parsedTempo = Number.parseInt(rawTempo, 10);
        const tempo = Number.isFinite(parsedTempo)
            ? Math.min(300, Math.max(30, parsedTempo))
            : state.melodicStudio.tempoBpm || 105;
        state.melodicStudio.tempoBpm = tempo;
        if (el('studioTempoInput')) el('studioTempoInput').value = String(tempo);
        if (el('studioTempoRange')) el('studioTempoRange').value = String(tempo);
        if (el('studioTempoValue')) el('studioTempoValue').textContent = String(tempo);
    }

    function playHarmonizationGroup(noteObj, techniqueId, button) {
        if (state.melodicStudio.groupPreviewTimers.length) {
            stopHarmonizationGroupPreview(button);
            return;
        }
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        const groupIndices = getGroupIndicesForHarmonization(noteObj, techniqueId, notesList);
        if (groupIndices.length < 2) return;

        ensureAudioInitialized();
        const bpm = Math.min(300, Math.max(30, state.melodicStudio.tempoBpm || 105));
        const beatMs = 60000 / bpm;
        let delay = 0;
        groupIndices.forEach(idx => {
            const note = notesList[idx];
            const timer = setTimeout(() => {
                const voicing = state.melodicStudio.autoFilledPhraseVoicings[idx];
                if (voicing?.notesWithOct?.length) {
                    playNotesList(voicing.notesWithOct, voicing.implicitBassNote);
                }
            }, delay);
            state.melodicStudio.groupPreviewTimers.push(timer);
            delay += getBeatsForDuration(note.dur) * beatMs;
        });
        const finishTimer = setTimeout(() => {
            state.melodicStudio.groupPreviewTimers = [];
            if (button) button.textContent = '▶ Escuchar conjunto';
        }, delay);
        state.melodicStudio.groupPreviewTimers.push(finishTimer);
        if (button) button.textContent = '⏹ Detener conjunto';
    }

    function playStudioPhrase(startIdx = 0, melodyOnly = false) {
        if (state.melodicStudio.groupPreviewTimers.length) stopHarmonizationGroupPreview();
        if (state.melodicStudio.isPlayingPhrase) {
            stopStudioPhrasePlayback();
            return;
        }
        // Al dar Play se esconde inmediatamente el modal flotante de armonización y se mantiene siempre en pantalla la partitura
        el('floatingHarmonizationModal')?.classList.add('hidden');
        el('melodicScoreScrollContainer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ensureAudioInitialized();
        const ex = getMelodicExampleById(state.melodicStudio.exampleId);
        const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
        if (!notesList.length) return;

        state.melodicStudio.isPlayingPhrase = true;
        el('studioLivePlaybackBanner')?.classList.add('studio-live-playback-active');
        if (melodyOnly && el('playMelodyOnlyBtn')) el('playMelodyOnlyBtn').textContent = '⏹️ Detener';
        else if (startIdx === 0 && el('playFullMelodicPhraseBtn')) el('playFullMelodicPhraseBtn').textContent = '⏹️ Detener';
        else if (el('playFromActiveNoteBtn')) el('playFromActiveNoteBtn').textContent = '⏹️ Detener';

        const bpm = state.melodicStudio.tempoBpm || 105;
        const beatMs = Math.round(60000 / bpm);
        const isSwing = state.melodicStudio.swingMode === 'swing';
        const isLoop = state.melodicStudio.isLoopingBar;
        const selIdxForLoop = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
        const activeBarNum = (notesList[selIdxForLoop] || notesList[0]).bar;

        let startIndex = startIdx;
        let endIndex = notesList.length;
        if (isLoop) {
            const firstInBar = notesList.findIndex(n => n.bar === activeBarNum);
            startIndex = firstInBar >= 0 ? firstInBar : 0;
            const lastInBar = notesList.findLastIndex ? notesList.findLastIndex(n => n.bar === activeBarNum) : (startIndex + 4);
            endIndex = (lastInBar >= 0 ? lastInBar : startIndex) + 1;
        }

        let accMs = 0;
        const triggeredBassSegments = new Set();

        for (let i = startIndex; i < endIndex; i++) {
            const n = notesList[i];
            const bVal = getBeatsForDuration(n.dur);
            let stepMs = bVal * beatMs;
            let noteOffset = 0;

            if (isSwing && (n.dur === '8' || n.dur === '8d')) {
                const isOffBeat = n.isWeakBeat || Math.abs((n.startBeatInBar % 1) - 0.5) < 0.05;
                if (isOffBeat) {
                    noteOffset = Math.round(beatMs * 0.12);
                }
            }

            const delay = accMs + noteOffset;
            const measureObj = ex.measures[n.measureIdx];
            const hrList = (measureObj && measureObj.harmonicRhythm) || [{ root: n.barChordRoot || 'C', type: n.barChordTypeKey || 'maj7', startBeat: 0, durationBeats: 4 }];

            const tId = setTimeout(() => {
                const comp = state.melodicStudio.autoFilledPhraseVoicings[i];
                updateStudioLivePlaybackBanner(n, comp, true);
                drawMelodicPhraseScore(i);
                scrollMelodicScoreToNote(i, 'auto');

                // Claqueta en tiempos 2 y 4 de cada compás
                if (state.melodicStudio.metronomeActive) {
                    const beatFloor = Math.floor(n.startBeatInBar);
                    if (beatFloor === 1 || beatFloor === 3) {
                        triggerMetronomeClick(beatFloor === 1);
                    }
                }

                if (!n.isRest) {
                    const noteDurTone = bVal >= 1.5 ? "2n" : (bVal >= 0.9 ? "4n" : "8n");
                    if (!melodyOnly && comp && comp.notesWithOct && comp.notesWithOct.length) {
                        triggerUpperVoiceNotes(comp.notesWithOct, noteDurTone);
                        updatePianoVisuals(comp.notesWithOct);
                    } else {
                        triggerUpperVoiceNotes([n.note], noteDurTone);
                        updatePianoVisuals([n.note]);
                    }
                    if (!melodyOnly) {
                        hrList.forEach((seg, sIdx) => {
                            const segKey = `${n.measureIdx}_${sIdx}`;
                            if (!triggeredBassSegments.has(segKey) && n.startBeatInBar >= seg.startBeat - 0.05 && n.startBeatInBar < seg.startBeat + seg.durationBeats) {
                                triggeredBassSegments.add(segKey);
                                triggerDeepBassNote(getImplicitBassWithOctave(seg.root, 55), seg.durationBeats >= 3.5 ? "1n" : "2n");
                            }
                        });
                    }
                }
            }, delay);
            state.melodicStudio.phraseTimers.push(tId);
            accMs += stepMs;
        }

        const endId = setTimeout(() => {
            stopStudioPhrasePlayback();
            if (isLoop && state.melodicStudio.isLoopingBar) {
                playStudioPhrase(startIndex, melodyOnly);
            } else {
                renderMelodicStudioUI();
            }
        }, accMs + 220);
        state.melodicStudio.phraseTimers.push(endId);
    }

    function loadCustomEditorDraftIntoStudio(manualMode = false) {
        const draft = state.melodicStudio.customEditorDraft;
        if (!draft || !draft.measures.length) return;
        const maxQ = getCustomEditorMaxQuarterBeats();
        const num = parseInt(draft.timeSigNum, 10) || 4;
        const den = parseInt(draft.timeSigDen, 10) || 4;
        const timeSigStr = `${num}/${den}`;

        // Garantizar que cada compás esté 100% completo según el compás simple elegido
        draft.measures.forEach(m => {
            fillRemainingBeatsInEditorBar(m, maxQ, m.notes.length === 0);
        });

        const halfQ = maxQ / 2;
        const builtMeasures = draft.measures.map((m, idx) => {
            const c1Sym = displayNote(m.chord1Root) + (chordStructures[m.chord1Type]?.cifrado || '');
            const c2Sym = displayNote(m.chord2Root) + (chordStructures[m.chord2Type]?.cifrado || '');
            const hr = m.splitCount === 2
                ? [{ root: m.chord1Root, type: m.chord1Type, startBeat: 0, durationBeats: halfQ }, { root: m.chord2Root, type: m.chord2Type, startBeat: halfQ, durationBeats: halfQ }]
                : [{ root: m.chord1Root, type: m.chord1Type, startBeat: 0, durationBeats: maxQ }];
            const notes = m.notes.map((n, nIdx) => ({
                note: n.note || 'E/5',
                dur: n.dur || 'q',
                isRest: !!n.isRest,
                isWeakBeat: (n.dur === '8' || n.dur === '16') && (nIdx % 2 === 1),
                pOrS: ((n.dur === '8' || n.dur === '16') && (nIdx % 2 === 1)) ? 'S' : 'P'
            }));
            return {
                bar: idx + 1,
                timeSignature: timeSigStr,
                chordRoot: m.chord1Root,
                chordTypeKey: m.chord1Type,
                chordSymbol: m.splitCount === 2 ? `${c1Sym} - ${c2Sym}` : c1Sym,
                harmonicRhythm: hr,
                notes
            };
        });
        const id = 'custom_' + Date.now();
        state.melodicStudio.customRandomExamples[id] = {
            id,
            bars: builtMeasures.length,
            timeSignature: timeSigStr,
            title: `✍️ Melodía Propia (${builtMeasures.length}C • ${timeSigStr}): ` + builtMeasures.map(m => m.chordSymbol).join(' | '),
            measures: builtMeasures
        };
        state.melodicStudio.exampleId = id;
        state.melodicStudio.barsCount = builtMeasures.length;
        state.melodicStudio.enharmonicNoteSpellingByNote = {};
        state.melodicStudio.stepByStepMode = manualMode;
        state.melodicStudio.manuallyClearedNotes = {};
        state.melodicStudio.selectedHarmonizationByNote = {};
        state.melodicStudio.autoFilledPhraseVoicings = {};
        state.melodicStudio.voicingDispositionByNote = {};
        state.melodicStudio.selectedNoteIdx = 0;
        populateMelodicStudioExamplesDropdown();
        el('customMelodyModalOverlay')?.classList.remove('visible');
        renderMelodicStudioUI();
    }

    function savePersistedState() {
        if (!state.currentUser || state.currentUser === 'Invitado') return null;
        try {
            const storageKey = 'bloqueArmonicoUser_v3_' + state.currentUser;
            const previousData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            localStorage.setItem(storageKey, JSON.stringify({
                ...previousData,
                version: 4,
                currentUser: state.currentUser,
                stats: state.stats,
                currentSession: state.currentSession,
                customRandomExamples: state.melodicStudio.customRandomExamples
            }));
            return true;
        } catch (error) {
            reportProfileStorageError('guardar', error);
            return false;
        }
    }

    function loadUserProfileStats(userName) {
        state.stats = JSON.parse(JSON.stringify(DEFAULT_STATS));
        state.currentSession = createEmptySession();
        state.melodicStudio.customRandomExamples = {};
        state.melodicStudio.exampleId = 'f3_4_1';
        if (!userName || userName === 'Invitado') {
            populateMelodicStudioExamplesDropdown();
            return;
        }
        try {
            const raw = localStorage.getItem('bloqueArmonicoUser_v3_' + userName);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new Error('El perfil guardado no tiene un formato válido.');
                }
                if (parsed.stats && typeof parsed.stats === 'object' && !Array.isArray(parsed.stats)) {
                    const savedCompetencies = parsed.stats.competencies;
                    state.stats = {
                        ...state.stats,
                        ...parsed.stats,
                        competencies: {
                            ...state.stats.competencies,
                            ...(savedCompetencies && typeof savedCompetencies === 'object' && !Array.isArray(savedCompetencies)
                                ? savedCompetencies
                                : {})
                        }
                    };
                }
                if (parsed.currentSession && typeof parsed.currentSession === 'object' && !Array.isArray(parsed.currentSession)) {
                    state.currentSession = {
                        ...state.currentSession,
                        ...parsed.currentSession,
                        startTime: Date.now()
                    };
                }
                if (parsed.customRandomExamples && typeof parsed.customRandomExamples === 'object' && !Array.isArray(parsed.customRandomExamples)) {
                    state.melodicStudio.customRandomExamples = parsed.customRandomExamples;
                }
            }
        } catch (error) {
            reportProfileStorageError('cargar', error);
        } finally {
            populateMelodicStudioExamplesDropdown();
        }
    }

    function populateWelcomeUserSelect() {
        const sel = el('welcomeUserSelect');
        if (!sel) return;
        try {
            const users = JSON.parse(localStorage.getItem('bloqueArmonicoUsers_v3') || '[]');
            if (!Array.isArray(users)) throw new Error('La lista de perfiles guardada no tiene un formato válido.');
            sel.replaceChildren(new Option('-- Cargar Perfil --', ''));
            [...new Set(users.filter(user => typeof user === 'string' && user.trim()))].forEach(user => {
                sel.add(new Option(user, user));
            });
        } catch (error) {
            reportProfileStorageError('cargar', error);
        }
    }

    function registerUserProfile(userName) {
        const users = JSON.parse(localStorage.getItem('bloqueArmonicoUsers_v3') || '[]');
        if (!Array.isArray(users)) throw new Error('La lista de perfiles guardada no tiene un formato válido.');
        if (users.includes(userName)) return false;
        localStorage.setItem('bloqueArmonicoUsers_v3', JSON.stringify([...users, userName]));
        return true;
    }

    function navigateChordGridVoice(delta) {
        const minIndex = state.continuityMode && !state.continuity.giveInitialNote ? 0 : 1;
        const maxIndex = state.orderedLabelsForDisplay.length - 1;
        if (maxIndex < minIndex) return;
        if (state.editingCellIndex === null) {
            const firstError = state.validatedCells.findIndex((status, index) => index >= minIndex && status === 'error');
            state.editingCellIndex = firstError !== -1 ? firstError : (delta > 0 ? minIndex : maxIndex);
        } else {
            let nextIndex = state.editingCellIndex + delta;
            if (nextIndex > maxIndex) nextIndex = minIndex;
            if (nextIndex < minIndex) nextIndex = maxIndex;
            state.editingCellIndex = nextIndex;
        }
        const status = el('activeVoiceNavStatus');
        if (status) {
            status.textContent = `Editando: ${state.editingCellIndex + 1}ª Voz (${state.orderedLabelsForDisplay[state.editingCellIndex] || ''})`;
        }
        const note = state.selectedUserNotes[state.editingCellIndex];
        if (note) triggerUpperVoiceNotes([note], "8n");
        updateDisplay();
    }

    function cycleContinuityBarPosition() {
        if (!state.continuityMode || !state.continuity.measures.length) return;
        const barIndex = state.continuity.currentBar;
        const bar = state.continuity.measures[barIndex];
        if (!bar) return;
        const chord = chordStructures[bar.chordTypeKey] || chordStructures.maj7;
        const rules = chord.continuity_rules || chord.voicing_rules || {};
        const leads = Object.keys(rules).filter(label => !['9', 'b9', '#9', '11', '#11', '13', 'b13'].includes(label));
        if (!leads.length) return;
        const nextLead = leads[(leads.indexOf(bar.leadLabel) + 1) % leads.length];
        bar.leadLabel = nextLead;
        const built = buildCloseVoicingForChordAndLead(bar.root, bar.chordTypeKey, nextLead);
        bar.expectedNotes = resolveVoicingSameLetterClashes(built.notesWithOct);
        bar.expectedLabels = built.labels;

        let previousVoices = [...bar.expectedNotes];
        for (let index = barIndex + 1; index < state.continuity.measures.length; index++) {
            const nextBar = state.continuity.measures[index];
            const linked = computeContinuityLinkBetweenMeasures(previousVoices, nextBar.root, nextBar.chordTypeKey);
            if (!linked) continue;
            nextBar.leadLabel = linked.leadLabel;
            nextBar.expectedNotes = resolveVoicingSameLetterClashes(linked.notesWithOct);
            nextBar.expectedLabels = linked.labels;
            nextBar.commonVoiceIndices = linked.commonVoiceIndices;
            nextBar.linkType = linked.linkType;
            previousVoices = [...nextBar.expectedNotes];
        }
        state.continuity.previousVoicesWithOctave = [];
        loadContinuityBar(barIndex);
        playNotesList([state.givenNoteWithOctave]);
        showFeedbackBanner(`🔄 Posición cambiada en C${barIndex + 1}: 1ª voz ahora en ${displayNote(state.givenNote)} (${state.givenLabel}).`, 'info');
    }

    function toggleContinuityGiveInitialNote() {
        if (!state.continuityMode) return;
        state.continuity.giveInitialNote = !state.continuity.giveInitialNote;
        const button = el('toggleInitialNoteBtn');
        if (button) {
            button.textContent = state.continuity.giveInitialNote ? '🎯 1ra Voz Inicial: DADA' : '✋ 1ra Voz Inicial: LIBRE';
            button.className = 'toolbar-btn ' + (state.continuity.giveInitialNote ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white');
        }
        loadContinuityBar(state.continuity.currentBar);
        if (!state.continuity.giveInitialNote) {
            state.selectedUserNotes = [];
            state.editingCellIndex = 0;
            updateDisplay();
            showFeedbackBanner('✋ Modo 1ª Voz Libre: ingresa las 4 voces desde la 1ª voz (aguda) hasta la 4ª voz.', 'info');
        }
    }

    function rpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63() {
        if (!Array.isArray(state.stats.progressionHistory)) state.stats.progressionHistory = [];
        const totalExercises = Number(state.stats.totalExercises) || 0;
        if (!totalExercises) return;
        const history = state.stats.progressionHistory;
        const latest = history[history.length - 1];
        if (latest?.totalExercises === totalExercises) return;
        const averageTime = state.currentSession.timedCount > 0
            ? state.currentSession.totalTimeSec / state.currentSession.timedCount
            : 5.4;
        history.push({
            totalExercises,
            label: String(totalExercises),
            acc: Math.round(((Number(state.stats.totalCorrect) || 0) / totalExercises) * 100),
            time: +averageTime.toFixed(1)
        });
        if (history.length > 12) history.splice(0, history.length - 12);
    }

    function renderLearningCurveChartsSVG() {
        const storedHistory = Array.isArray(state.stats.progressionHistory)
            ? state.stats.progressionHistory.slice(-12)
            : [];
        const history = storedHistory.filter(point => point && typeof point === 'object').map((point, index) => ({
            label: String(point.label || `#${index + 1}`),
            acc: Number.isFinite(Number(point.acc)) ? Math.max(0, Math.min(100, Number(point.acc))) : null,
            time: Number.isFinite(Number(point.time)) ? Math.max(0.5, Number(point.time)) : null
        })).filter(point => point.acc !== null || point.time !== null);
        if (!history.length) {
            history.push(
                { label: 'Ini', acc: 65, time: 9.2 },
                {
                    label: 'Actual',
                    acc: state.stats.totalExercises > 0
                        ? Math.round((state.stats.totalCorrect / state.stats.totalExercises) * 100)
                        : 85,
                    time: state.currentSession.timedCount > 0
                        ? +(state.currentSession.totalTimeSec / state.currentSession.timedCount).toFixed(1)
                        : 5.4
                }
            );
        }

        const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
        })[char]);
        const width = 520, height = 150, left = 36, right = 18, top = 20, bottom = 26;
        const plotWidth = width - left - right;
        const plotHeight = height - top - bottom;
        const maxTime = Math.max(12, ...history.map(point => point.time || 5));
        const toPoints = (key, max) => history.map((point, index) => {
            const value = point[key] ?? (key === 'acc' ? 0 : 5);
            return {
                x: left + (history.length === 1 ? plotWidth / 2 : (index / (history.length - 1)) * plotWidth),
                y: top + plotHeight - (Math.max(0, Math.min(max, value)) / max) * plotHeight,
                value,
                label: escapeXml(point.label)
            };
        });
        const accuracyPoints = toPoints('acc', 100);
        const speedPoints = toPoints('time', maxTime);
        const polyline = points => points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
        const chart = (points, title, color, valueSuffix, topLabel, bottomLabel) => `
            <div class="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700">
                <div class="text-[11px] font-extrabold mb-1" style="color:${color}">${title}</div>
                <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto" role="img" aria-label="${title}">
                    <line x1="${left}" y1="${top}" x2="${width - right}" y2="${top}" stroke="#334155" stroke-dasharray="3,3"/>
                    <line x1="${left}" y1="${top + plotHeight / 2}" x2="${width - right}" y2="${top + plotHeight / 2}" stroke="#334155" stroke-dasharray="3,3"/>
                    <line x1="${left}" y1="${top + plotHeight}" x2="${width - right}" y2="${top + plotHeight}" stroke="#475569"/>
                    <text x="6" y="${top + 4}" fill="#94a3b8" font-size="10">${topLabel}</text>
                    <text x="12" y="${top + plotHeight + 4}" fill="#94a3b8" font-size="10">${bottomLabel}</text>
                    <polyline fill="none" stroke="${color}" stroke-width="3" points="${polyline(points)}"/>
                    ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${color}"/><text x="${point.x}" y="${point.y - 7}" fill="#e2e8f0" font-size="9.5" font-weight="bold" text-anchor="middle">${point.value}${valueSuffix}</text><text x="${point.x}" y="${height - 6}" fill="#cbd5e1" font-size="9" text-anchor="middle">${point.label}</text>`).join('')}
                </svg>
            </div>`;
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
            ${chart(accuracyPoints, '📈 Curva de Aprendizaje: Precisión (%)', '#10b981', '%', '100%', '0%')}
            ${chart(speedPoints, '⏱️ Curva de Velocidad de Respuesta (s / acorde)', '#38bdf8', 's', `${maxTime}s`, '0s')}
        </div>`;
    }

    async function exportFullGuideToPdf() {
        const sourceModal = el('pdfReferenceModalOverlay')?.querySelector('.modal-content');
        if (!sourceModal) {
            showFeedbackBanner('❌ No se encontró la Guía Teórica para exportar.', 'error');
            return;
        }
        if (typeof html2canvas === 'undefined' || !window.jspdf) {
            showFeedbackBanner('❌ No están disponibles las herramientas necesarias para generar el PDF.', 'error');
            return;
        }
        showFeedbackBanner('📄 Generando PDF de la Guía con formato APA 7...', 'info');

        const contentWidthPx = 624;
        const offscreenWrap = document.createElement('div');
        offscreenWrap.style.cssText = `position:fixed;left:0;top:0;z-index:-1;width:${contentWidthPx}px;background:#fff;color:#111827;padding:0;font-family:"Times New Roman",serif;`;
        const printableContent = sourceModal.cloneNode(true);
        printableContent.style.cssText = `display:block;width:${contentWidthPx}px;max-width:none;max-height:none;overflow:visible;padding:0;margin:0;background:#fff;color:#111827;border:0;box-shadow:none;font-family:"Times New Roman",serif;font-size:16px;line-height:2;text-align:left;`;
        printableContent.querySelectorAll('button, input, select').forEach(control => control.remove());
        printableContent.querySelectorAll('.overflow-y-auto, [class*="max-h-"]').forEach(box => {
            box.style.maxHeight = 'none';
            box.style.overflow = 'visible';
        });
        printableContent.querySelectorAll('*').forEach(node => {
            node.style.setProperty('background-color', '#fff', 'important');
            node.style.setProperty('background-image', 'none', 'important');
            node.style.setProperty('box-shadow', 'none', 'important');
            node.style.setProperty('border-color', '#9ca3af', 'important');
            node.style.setProperty('color', '#111827', 'important');
            node.style.setProperty('opacity', '1', 'important');
            node.style.setProperty('font-family', '"Times New Roman", serif', 'important');
            node.style.setProperty('font-size', '16px', 'important');
            node.style.setProperty('line-height', '2', 'important');
            node.style.setProperty('text-align', 'left', 'important');
            node.style.setProperty('overflow', 'visible', 'important');
            node.style.setProperty('max-height', 'none', 'important');
            node.style.setProperty('box-sizing', 'border-box', 'important');
            node.style.setProperty('float', 'none', 'important');
            node.style.setProperty('position', 'static', 'important');
            node.style.setProperty('transform', 'none', 'important');
            if (node.tagName === 'H3') {
                node.style.setProperty('font-size', '20px', 'important');
                node.style.setProperty('font-weight', '700', 'important');
                node.style.setProperty('text-align', 'center', 'important');
                node.style.setProperty('margin', '0 0 12px', 'important');
            } else if (node.tagName === 'H4') {
                node.style.setProperty('font-weight', '700', 'important');
                node.style.setProperty('margin', '12px 0 4px', 'important');
            } else if (node.tagName === 'TABLE') {
                node.style.setProperty('width', '100%', 'important');
                node.style.setProperty('table-layout', 'fixed', 'important');
                node.style.setProperty('border-collapse', 'collapse', 'important');
                node.style.setProperty('line-height', '1.5', 'important');
            } else if (node.tagName === 'TD' || node.tagName === 'TH') {
                node.style.setProperty('font-size', '12px', 'important');
                node.style.setProperty('line-height', '1.5', 'important');
                node.style.setProperty('padding', '4px', 'important');
                node.style.setProperty('overflow-wrap', 'anywhere', 'important');
            } else if (node.tagName === 'CODE' || node.tagName === 'KBD') {
                node.style.setProperty('font-family', '"Courier New", monospace', 'important');
                node.style.setProperty('font-size', '13px', 'important');
                node.style.setProperty('line-height', '1.5', 'important');
            } else if (node.tagName === 'UL' || node.tagName === 'OL') {
                node.style.setProperty('padding-left', '32px', 'important');
                node.style.setProperty('margin', '0 0 8px', 'important');
            } else if (node.tagName === 'LI' || node.tagName === 'P') {
                node.style.setProperty('margin-bottom', '8px', 'important');
            }
        });
        offscreenWrap.appendChild(printableContent);
        document.body.appendChild(offscreenWrap);

        let currentBlockDescription = 'portada';
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'letter');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 25.4;
            const usableWidth = pageWidth - margin * 2;
            const usableHeight = pageHeight - margin * 2;
            const pixelToMm = usableWidth / contentWidthPx;
            const canvasScale = 1.5;
            const canvasPixelToMm = pixelToMm / canvasScale;
            const maxBlockHeight = usableHeight / pixelToMm;
            const contentContainer = Array.from(printableContent.children)
                .find(child => child.classList.contains('space-y-3.5'));
            const headerBlocks = Array.from(printableContent.children)
                .filter(child => child !== contentContainer && child.textContent.trim());
            const sections = Array.from(contentContainer?.children || []).filter(child => child.textContent.trim());
            if (!headerBlocks.length || !sections.length) throw new Error('La guía no contiene secciones exportables.');

            const paintWhitePage = () => {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            };
            const drawPageNumber = pageNumber => {
                pdf.setFont('times', 'normal');
                pdf.setFontSize(12);
                pdf.setTextColor(17, 24, 39);
                pdf.text(String(pageNumber), pageWidth - margin, 15, { align: 'right' });
            };
            const startContentPage = () => {
                pdf.addPage();
                paintWhitePage();
                drawPageNumber(pdf.internal.getNumberOfPages());
                return margin;
            };

            paintWhitePage();
            drawPageNumber(1);
            pdf.setFont('times', 'bold');
            pdf.setFontSize(14);
            pdf.text('Guía Teórica y Práctica de Armonía', pageWidth / 2, 92, { align: 'center', maxWidth: usableWidth });
            pdf.setFont('times', 'normal');
            pdf.setFontSize(12);
            pdf.text('Bloque Armónico Pro', pageWidth / 2, 103, { align: 'center' });
            pdf.text('Guía de estudio', pageWidth / 2, 114, { align: 'center' });

            let cursorY = startContentPage();
            const renderCanvas = async block => {
                currentBlockDescription = block.tagName;
                const canvas = await html2canvas(block, {
                    backgroundColor: '#ffffff',
                    scale: canvasScale,
                    useCORS: true,
                    width: contentWidthPx
                });
                if (!canvas.width || !canvas.height) throw new Error('No se pudo capturar una sección de la guía.');
                return canvas;
            };
            const titleCanvas = await renderCanvas(headerBlocks[0]);
            let imageHeight = titleCanvas.height * canvasPixelToMm;
            if (cursorY + imageHeight > pageHeight - margin) cursorY = startContentPage();
            pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', margin, cursorY, usableWidth, imageHeight);
            cursorY += imageHeight;
            if (headerBlocks[1]) {
                const subtitleCanvas = await renderCanvas(headerBlocks[1]);
                imageHeight = subtitleCanvas.height * canvasPixelToMm;
                if (cursorY + imageHeight > pageHeight - margin) cursorY = startContentPage();
                pdf.addImage(subtitleCanvas.toDataURL('image/png'), 'PNG', margin, cursorY, usableWidth, imageHeight);
                cursorY += imageHeight + 4;
            }

            const renderableBlocks = [];
            const listWrapper = (tagName, item) => {
                const wrapper = document.createElement(tagName);
                wrapper.style.cssText = `width:${contentWidthPx}px;margin:0 0 8px;padding-left:32px;font-family:"Times New Roman",serif;font-size:16px;line-height:2;color:#111827;`;
                wrapper.appendChild(item);
                offscreenWrap.appendChild(wrapper);
                return wrapper;
            };
            const splitOversizedBlock = block => {
                if (block.getBoundingClientRect().height <= maxBlockHeight) {
                    renderableBlocks.push(block);
                    return;
                }
                if ((block.tagName === 'UL' || block.tagName === 'OL') && block.children.length) {
                    Array.from(block.children).forEach(item => {
                        splitOversizedBlock(listWrapper(block.tagName.toLowerCase(), item.cloneNode(true)));
                    });
                    return;
                }
                if (block.tagName === 'TABLE' && block.rows.length > 1) {
                    const headerRow = block.tHead?.rows[0];
                    Array.from(block.rows).forEach(row => {
                        const tablePart = block.cloneNode(false);
                        const body = document.createElement('tbody');
                        if (headerRow && row !== headerRow) body.appendChild(headerRow.cloneNode(true));
                        body.appendChild(row.cloneNode(true));
                        tablePart.appendChild(body);
                        offscreenWrap.appendChild(tablePart);
                        splitOversizedBlock(tablePart);
                    });
                    return;
                }
                const children = Array.from(block.children);
                if (children.length) {
                    children.forEach(splitOversizedBlock);
                    return;
                }
                renderableBlocks.push(block);
            };
            sections.forEach(splitOversizedBlock);

            for (const block of renderableBlocks) {
                const canvas = await renderCanvas(block);
                imageHeight = canvas.height * canvasPixelToMm;
                if (cursorY + imageHeight > pageHeight - margin && cursorY > margin) cursorY = startContentPage();
                if (imageHeight <= usableHeight) {
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, cursorY, usableWidth, imageHeight);
                    cursorY += imageHeight + 2;
                    continue;
                }

                const sliceHeight = Math.max(1, Math.floor(usableHeight / canvasPixelToMm));
                for (let sourceY = 0; sourceY < canvas.height; sourceY += sliceHeight) {
                    if (sourceY > 0) cursorY = startContentPage();
                    const currentHeight = Math.min(sliceHeight, canvas.height - sourceY);
                    const pageSlice = document.createElement('canvas');
                    pageSlice.width = canvas.width;
                    pageSlice.height = currentHeight;
                    const context = pageSlice.getContext('2d');
                    if (!context) throw new Error('No se pudo preparar una página de la guía.');
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, pageSlice.width, pageSlice.height);
                    context.drawImage(canvas, 0, sourceY, canvas.width, currentHeight, 0, 0, canvas.width, currentHeight);
                    imageHeight = currentHeight * canvasPixelToMm;
                    pdf.addImage(pageSlice.toDataURL('image/png'), 'PNG', margin, cursorY, usableWidth, imageHeight);
                    cursorY += imageHeight + 2;
                }
            }

            pdf.save('Guia_Completa_Bloque_Armonico_Pro.pdf');
            showFeedbackBanner('✅ Guía exportada en formato APA 7 (papel Carta, márgenes de 1 pulgada y páginas numeradas).', 'success');
        } catch (error) {
            console.error('Error al exportar la Guía Teórica en PDF:', currentBlockDescription, error);
            showFeedbackBanner('❌ No se pudo completar la exportación del PDF.', 'error');
        } finally {
            offscreenWrap.remove();
        }
    }

    function setupListeners() {
        populateWelcomeUserSelect();
        if (el('welcomeNewUserInput')) {
            el('welcomeNewUserInput').addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    el('welcomeLoginBtn')?.click();
                }
            });
        }
        if (el('welcomeLoginBtn')) {
            el('welcomeLoginBtn').addEventListener('click', () => {
                const newName = (el('welcomeNewUserInput')?.value || '').trim();
                const selectedName = el('welcomeUserSelect')?.value || '';
                const chosen = newName || selectedName || 'Estudiante';
                let isBrandNewUser = false;
                try {
                    isBrandNewUser = registerUserProfile(chosen);
                } catch (error) {
                    reportProfileStorageError('registrar', error);
                }
                state.currentUser = chosen;
                try {
                    loadUserProfileStats(chosen);
                    registerDailyPracticeActivity();
                    savePersistedState();
                } catch (err) {}
                el('welcomeModalOverlay')?.classList.remove('visible');
                el('finalMessageDisplay')?.classList.add('hidden');
                el('mainAppContainer')?.classList.remove('hidden');
                updateDisplay();
                if (isBrandNewUser && !state.stats.tutorialSeen) {
                    if (el('tutorialUserName')) el('tutorialUserName').textContent = chosen;
                    el('tutorialPromptModalOverlay')?.classList.add('visible');
                }
            });
        }

        // Disposiciones en el Estudio Melódico: SOLO aplica al acorde seleccionado (solo cuando se pulsa "Aplicar a Toda la Armonización" se aplica a todos)
        document.querySelectorAll('.studio-drop-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const chosenDisp = e.currentTarget.dataset.studioDrop || 'close';
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
                if (notesList[selIdx] && !notesList[selIdx].isRest) {
                    state.melodicStudio.selectedNoteIdx = selIdx;
                    state.melodicStudio.voicingDispositionByNote[selIdx] = chosenDisp;
                    state.melodicStudio.autoFilledPhraseVoicings[selIdx] = computeHarmonizationForMelodicNote(notesList[selIdx]);
                    const comp = state.melodicStudio.autoFilledPhraseVoicings[selIdx];
                    if (comp) playNotesList(comp.notesWithOct, comp.implicitBassNote);
                    showFeedbackBanner(`📐 Disposición [${DISPOSITION_HUMAN_NAMES[chosenDisp] || chosenDisp}] aplicada únicamente al acorde seleccionado (Compás ${notesList[selIdx].bar}).`, 'info');
                } else {
                    showFeedbackBanner('⚠️ Selecciona primero una nota (no silencio) en la partitura para cambiar su disposición.', 'info');
                }
                renderMelodicStudioUI();
            });
        });
        if (el('applyDropToAllPhraseBtn')) {
            el('applyDropToAllPhraseBtn').addEventListener('click', () => {
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                const refIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
                const dispToApply = state.melodicStudio.voicingDispositionByNote[refIdx] || state.melodicStudio.voicingDisposition || 'close';
                state.melodicStudio.voicingDisposition = dispToApply;
                notesList.forEach(n => {
                    if (!n.isRest) {
                        state.melodicStudio.voicingDispositionByNote[n.globalIdx] = dispToApply;
                        state.melodicStudio.autoFilledPhraseVoicings[n.globalIdx] = computeHarmonizationForMelodicNote(n);
                    }
                });
                renderMelodicStudioUI();
                showFeedbackBanner(`📐 Disposición [${dispToApply}] aplicada a toda la armonización.`, 'success');
            });
        }
        if (el('welcomeDeleteUserBtn')) {
            el('welcomeDeleteUserBtn').addEventListener('click', () => {
                const u = el('welcomeUserSelect')?.value;
                if (!u) return;
                try {
                    const users = JSON.parse(localStorage.getItem('bloqueArmonicoUsers_v3') || '[]').filter(x => x !== u);
                    localStorage.setItem('bloqueArmonicoUsers_v3', JSON.stringify(users));
                    localStorage.removeItem('bloqueArmonicoUser_v3_' + u);
                    populateWelcomeUserSelect();
                } catch (error) {
                    reportProfileStorageError('eliminar', error);
                }
            });
        }
        if (el('promptStartTutorialBtn')) {
            el('promptStartTutorialBtn').addEventListener('click', () => {
                state.stats.tutorialSeen = true;
                savePersistedState();
                el('tutorialPromptModalOverlay')?.classList.remove('visible');
                el('showTutorialButton')?.click();
            });
        }
        if (el('promptSkipTutorialBtn')) {
            el('promptSkipTutorialBtn').addEventListener('click', () => {
                state.stats.tutorialSeen = true;
                savePersistedState();
                el('tutorialPromptModalOverlay')?.classList.remove('visible');
            });
        }
        if (el('welcomeGuestBtn')) {
            el('welcomeGuestBtn').addEventListener('click', () => {
                state.currentUser = 'Invitado';
                loadUserProfileStats('Invitado');
                el('welcomeModalOverlay')?.classList.remove('visible');
                el('finalMessageDisplay')?.classList.add('hidden');
                el('mainAppContainer')?.classList.remove('hidden');
                updateDisplay();
            });
        }
        if (el('switchUserButton') || el('userProfileBadge')) {
            [el('switchUserButton'), el('userProfileBadge')].forEach(b => b?.addEventListener('click', () => {
                populateWelcomeUserSelect();
                el('mainAppContainer')?.classList.add('hidden');
                el('welcomeModalOverlay')?.classList.add('visible');
            }));
        }
        if (el('resetStatsBtn')) {
            el('resetStatsBtn').addEventListener('click', () => {
                state.stats.totalCorrect = 0;
                state.stats.totalIncorrect = 0;
                state.stats.currentStreak = 0;
                savePersistedState();
                updateDisplay();
            });
        }

        // Conectar botones de Medallas (🏆), Reto a Medida (🎯), Estadísticas (📊), Ajustes (⚙️), Banco de Errores (🔄), Dictado (👂), Enarmonía (♯♭), Bajo y Disposiciones
        if (el('badgesButton')) {
            el('badgesButton').addEventListener('click', () => {
                const unl = state.stats.unlockedBadges || [];
                if (el('badgesGridContainer')) {
                    el('badgesGridContainer').innerHTML = BADGES_CATALOG.map(b =>
                        `<div class="p-3 rounded-xl border flex items-center gap-3 ${unl.includes(b.id) ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold' : 'opacity-40 grayscale'}">
                            <div class="text-3xl">${b.icon}</div>
                            <div><div class="font-extrabold text-sm">${b.title}</div><div class="text-xs opacity-80">${b.desc}</div></div>
                        </div>`
                    ).join('');
                }
                el('badgesModalOverlay')?.classList.add('visible');
            });
        }
        if (el('closeBadgesButton')) el('closeBadgesButton').addEventListener('click', () => el('badgesModalOverlay')?.classList.remove('visible'));

        if (el('customChallengeButton')) {
            el('customChallengeButton').addEventListener('click', () => {
                if (el('customRootSelect')) el('customRootSelect').innerHTML = allRoots.map(r => `<option value="${r}">${displayNote(r)}</option>`).join('');
                if (el('customChordTypeSelect')) {
                    el('customChordTypeSelect').innerHTML = Object.keys(chordStructures).map(k => {
                        const chord = chordStructures[k];
                        const label = chord?.cifrado ? `${chord.cifrado} (${chord.name})` : (chord?.name || k);
                        return `<option value="${k}">${label}</option>`;
                    }).join('');
                }
                const updLeads = () => {
                    const cKey = el('customChordTypeSelect')?.value || 'maj7';
                    const rules = chordStructures[cKey]?.voicing_rules || {};
                    if (el('customLeadSelect')) {
                        el('customLeadSelect').innerHTML = Object.keys(rules).map(l => `<option value="${l}">${l}</option>`).join('');
                    }
                };
                if (el('customChordTypeSelect')) el('customChordTypeSelect').onchange = updLeads;
                updLeads();
                el('customChallengeModalOverlay')?.classList.add('visible');
            });
        }
        if (el('closeCustomChallengeButton')) el('closeCustomChallengeButton').addEventListener('click', () => el('customChallengeModalOverlay')?.classList.remove('visible'));
        if (el('applyCustomChallengeButton')) {
            el('applyCustomChallengeButton').addEventListener('click', () => {
                const r = el('customRootSelect')?.value || 'C';
                const c = el('customChordTypeSelect')?.value || 'maj7';
                const l = el('customLeadSelect')?.value || '3';
                state.melodicStudio.isActive = false;
                state.continuityMode = false;
                state.isCustomChallenge = true;
                state.forcedChordTypeKey = c;
                if (el('practiceChordTypeSelect')) el('practiceChordTypeSelect').value = c;
                state.studioHarmonicBlockVisible = false;
                renderMelodicStudioUI();
                renderContinuityPanel();
                const built = buildCloseVoicingForChordAndLead(r, c, l);
                const disp = applyDispositionToCloseVoicing(r, c, l, built.labels, built.notesWithOct, state.voicingType);
                state.chordRoot = r; state.chordTypeKey = c; state.givenLabel = l;
                state.givenNoteWithOctave = disp.notesWithOct[0];
                state.givenNote = disp.notesWithOct[0].split('/')[0];
                state.orderedLabelsForDisplay = [...disp.labels];
                state.correctNotesWithOctave = [...disp.notesWithOct];
                state.correctNotes = disp.notesWithOct.map(x => x.split('/')[0]);
                state.selectedUserNotes = [state.givenNoteWithOctave];
                state.validatedCells = [null, null, null, null, null];
                state.exerciseSolved = false;
                el('customChallengeModalOverlay')?.classList.remove('visible');
                updateDisplay();
                showFeedbackBanner(`🎯 Practicando ${displayNote(r)}${chordStructures[c]?.cifrado || ''} con melodía en ${l}.`, 'info');
            });
        }

        if (el('viewHistoryButton')) {
            el('viewHistoryButton').addEventListener('click', () => {
                if (el('historyModalContent')) {
                    el('historyModalContent').innerHTML = buildFullGamifiedSessionReportHTML(false);
                }
                el('historyModalOverlay')?.classList.add('visible');
            });
        }
        if (el('closeHistoryModalButton')) el('closeHistoryModalButton').addEventListener('click', () => el('historyModalOverlay')?.classList.remove('visible'));

        let activeSettingsTab = state.difficulty || 'intermediate';
        const renderSettingsModalForLevel = level => {
            activeSettingsTab = level;
            const levelNames = { basic: 'Básico', intermediate: 'Intermedio', advanced: 'Avanzado' };
            if (el('settingsActiveLevelLabel')) {
                el('settingsActiveLevelLabel').textContent = levelNames[level] || levelNames.intermediate;
            }
            if (el('settingsLeadFilterLevelLabel')) {
                el('settingsLeadFilterLevelLabel').textContent = levelNames[level] || levelNames.intermediate;
            }
            document.querySelectorAll('.settings-lvl-tab').forEach(button => {
                const isActive = button.dataset.settingsTab === level;
                button.className = 'settings-lvl-tab toolbar-btn flex-1 ' +
                    (isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-800');
            });

            const chordKeys = Object.keys(chordStructures).filter(key =>
                level === 'basic'
                    ? chordStructures[key].difficulty === 'basic'
                    : chordStructures[key].difficulty === 'intermediate'
            );
            const cfg = state.customPractice[level] || { isActive: false, allowedChords: [], allowedLeads: [] };
            const chordCheckboxes = el('chordTypesCheckboxes');
            if (chordCheckboxes) {
                chordCheckboxes.innerHTML = chordKeys.map(key => {
                    const checked = !cfg.isActive || !cfg.allowedChords.length || cfg.allowedChords.includes(key);
                    return `<label class="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 bg-white cursor-pointer font-bold">
                        <input type="checkbox" class="settings-chord-cb" value="${key}" ${checked ? 'checked' : ''}>
                        <span>${chordStructures[key].name}</span>
                    </label>`;
                }).join('');
            }

            const leadSection = el('leadVoicesSettingsSection');
            leadSection?.classList.remove('hidden');
            if (el('leadVoicesCheckboxes')) {
                const availableLeads = level === 'advanced'
                    ? ADVANCED_TENSION_LEADS
                    : PRACTICE_LEAD_LABELS.filter(label =>
                        chordKeys.some(key => Object.keys(chordStructures[key].voicing_rules || {}).includes(label))
                    );
                el('leadVoicesCheckboxes').innerHTML = availableLeads.map(label => {
                    const checked = !cfg.isActive || !cfg.allowedLeads.length || cfg.allowedLeads.includes(label);
                    return `<label class="flex items-center gap-1.5 p-1.5 rounded border border-purple-200 bg-white cursor-pointer font-mono font-bold">
                        <input type="checkbox" class="settings-lead-cb" value="${label}" ${checked ? 'checked' : ''}>
                        <span>${label}</span>
                    </label>`;
                }).join('');
            }
        };
        el('settingsButton')?.addEventListener('click', () => {
            renderSettingsModalForLevel(state.difficulty || 'intermediate');
            el('settingsModalOverlay')?.classList.add('visible');
        });
        document.querySelectorAll('.settings-lvl-tab').forEach(button => {
            button.addEventListener('click', event => renderSettingsModalForLevel(event.currentTarget.dataset.settingsTab));
        });
        el('selectAllChordsBtn')?.addEventListener('click', () => {
            el('chordTypesCheckboxes')?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = true; });
        });
        el('deselectAllChordsBtn')?.addEventListener('click', () => {
            el('chordTypesCheckboxes')?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
        });
        el('selectAllLeadsBtn')?.addEventListener('click', () => {
            el('leadVoicesCheckboxes')?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = true; });
        });
        el('deselectAllLeadsBtn')?.addEventListener('click', () => {
            el('leadVoicesCheckboxes')?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
        });
        if (el('cancelSettingsButton')) el('cancelSettingsButton').addEventListener('click', () => el('settingsModalOverlay')?.classList.remove('visible'));
        if (el('saveSettingsButton')) {
            el('saveSettingsButton').addEventListener('click', () => {
                const selectedChords = Array.from(el('chordTypesCheckboxes')?.querySelectorAll('input:checked') || []).map(input => input.value);
                const selectedLeads = Array.from(el('leadVoicesCheckboxes')?.querySelectorAll('input:checked') || []).map(input => input.value);
                if (!selectedChords.length) {
                    showFeedbackBanner('⚠️ Selecciona al menos un tipo de acorde para este nivel.', 'error');
                    return;
                }
                if (!selectedLeads.length) {
                    showFeedbackBanner('⚠️ Selecciona al menos una nota para la voz superior de este nivel.', 'error');
                    return;
                }
                state.customPractice[activeSettingsTab] = {
                    isActive: true,
                    allowedChords: selectedChords,
                    allowedLeads: selectedLeads
                };
                state.difficulty = activeSettingsTab;
                if (state.difficulty === 'basic') {
                    state.voicingType = 'close';
                    if (el('voicingSelect')) el('voicingSelect').value = 'close';
                }
                populatePracticeChordTypeSelect();
                document.querySelectorAll('.diff-btn').forEach(button => {
                    const active = button.dataset.diff === state.difficulty;
                    button.className = 'diff-btn toolbar-btn ' +
                        (active ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-800');
                });
                el('settingsModalOverlay')?.classList.remove('visible');
                generateStandAloneExercise();
                showFeedbackBanner(`⚙️ Ajustes guardados y aplicados al nivel ${activeSettingsTab.toUpperCase()}.`, 'success');
            });
        }

        if (el('errorBankButton')) {
            el('errorBankButton').addEventListener('click', () => {
                if (!(state.stats.errorBank || []).length) {
                    showFeedbackBanner('ℹ️ No tienes acordes pendientes en el Banco de Errores.', 'info');
                    return;
                }
                state.errorReviewMode = !state.errorReviewMode;
                el('errorReviewModeBadge')?.classList.toggle('hidden', !state.errorReviewMode);
                generateStandAloneExercise();
            });
        }
        if (el('dictationModeBtn')) {
            el('dictationModeBtn').addEventListener('click', () => {
                state.dictationMode = !state.dictationMode;
                el('dictationModeBtn').classList.toggle('bg-pink-600', state.dictationMode);
                el('dictationModeBtn').classList.toggle('text-white', state.dictationMode);
                el('dictationModeBadge')?.classList.toggle('hidden', !state.dictationMode);
                updateDisplay();
                if (state.dictationMode) playNotesList(state.correctNotesWithOctave);
            });
        }
        if (el('strictEnharmonicBtn')) {
            el('strictEnharmonicBtn').addEventListener('click', () => {
                state.strictEnharmonic = !state.strictEnharmonic;
                el('strictEnharmonicBtn').classList.toggle('bg-amber-500', state.strictEnharmonic);
                el('strictEnharmonicBtn').classList.toggle('text-white', state.strictEnharmonic);
            });
        }
        if (el('voicingSelect')) {
            el('voicingSelect').addEventListener('change', e => {
                state.voicingType = e.target.value;
                const built = buildCloseVoicingForChordAndLead(state.chordRoot, state.chordTypeKey, state.givenLabel, state.givenNoteWithOctave);
                const disp = applyDispositionToCloseVoicing(state.chordRoot, state.chordTypeKey, state.givenLabel, built.labels, built.notesWithOct, state.voicingType);
                state.orderedLabelsForDisplay = [...disp.labels];
                state.correctNotesWithOctave = [...disp.notesWithOct];
                state.correctNotes = disp.notesWithOct.map(x => x.split('/')[0]);
                state.selectedUserNotes = [state.givenNoteWithOctave];
                state.validatedCells = [null, null, null, null, null];
                updateDisplay();
            });
        }
        if (el('addBassBtn')) {
            el('addBassBtn').addEventListener('click', () => {
                state.includeBass = !state.includeBass;
                el('addBassBtn').classList.toggle('bg-amber-600', state.includeBass);
                el('addBassBtn').classList.toggle('text-white', state.includeBass);
                generateStandAloneExercise();
            });
        }
        if (el('staffModeSelect')) {
            el('staffModeSelect').addEventListener('change', e => {
                state.staffMode = e.target.value;
                drawMusicalStaff(state.selectedUserNotes);
            });
        }

        if (el('toggleIndLeadPanelBtn')) {
            el('toggleIndLeadPanelBtn').addEventListener('click', () => {
                state.melodicStudio.showSeparateIndLead = !state.melodicStudio.showSeparateIndLead;
                renderMelodicStudioUI();
            });
        }
        if (el('toggleTonicPanelBtn')) {
            el('toggleTonicPanelBtn').addEventListener('click', () => {
                state.melodicStudio.showSeparateTonic = !state.melodicStudio.showSeparateTonic;
                renderMelodicStudioUI();
            });
        }
        if (el('continuityHistorySelect')) {
            el('continuityHistorySelect').addEventListener('change', e => {
                const idx = parseInt(e.target.value, 10);
                if (idx >= 0) openContinuitySummaryModal(idx);
            });
        }

        for (let i = 1; i < 5; i++) {
            el('gridCell' + i)?.addEventListener('click', () => {
                if (state.selectedUserNotes[i]) {
                    state.editingCellIndex = state.editingCellIndex === i ? null : i;
                    updateDisplay();
                }
            });
        }
        if (el('musicalStaffCanvas')) {
            el('musicalStaffCanvas').addEventListener('click', e => {
                const canvas = el('musicalStaffCanvas');
                const rect = canvas.getBoundingClientRect();
                const logicalH = parseFloat(canvas.dataset.logicalHeight) || canvas.height || 255;
                const y = (e.clientY - rect.top) * (logicalH / rect.height);
                const { treble, bass, useGrand } = state.lastRenderedStaves;
                if (!treble) return;
                const st = (useGrand && bass && y >= 115) ? bass : treble;
                const topIdx = (useGrand && bass && y >= 115) ? (3 * 7 + 5) : (5 * 7 + 3);
                const diatonic = topIdx - Math.round((y - st.getYForLine(0)) / 5);
                const letter = numberToLetterMap[((diatonic % 7) + 7) % 7];
                if (letter) addUserVoiceNote(letter);
            });
        }

        if (el('btnNotationAmerican') && el('btnNotationLatin')) {
            el('btnNotationAmerican').addEventListener('click', () => {
                state.notationSystem = 'american';
                el('btnNotationAmerican').className = 'px-2.5 py-1 text-xs font-extrabold rounded-full bg-white text-blue-700 border-0 cursor-pointer';
                el('btnNotationLatin').className = 'px-2.5 py-1 text-xs font-extrabold rounded-full bg-transparent text-slate-700 border-0 cursor-pointer';
                generateNoteButtons(); renderMelodicStudioUI(); updateDisplay();
            });
            el('btnNotationLatin').addEventListener('click', () => {
                state.notationSystem = 'latin';
                el('btnNotationLatin').className = 'px-2.5 py-1 text-xs font-extrabold rounded-full bg-white text-blue-700 border-0 cursor-pointer';
                el('btnNotationAmerican').className = 'px-2.5 py-1 text-xs font-extrabold rounded-full bg-transparent text-slate-700 border-0 cursor-pointer';
                generateNoteButtons(); renderMelodicStudioUI(); updateDisplay();
            });
        }

        document.querySelectorAll('.diff-btn').forEach(btn => btn.addEventListener('click', e => {
            state.difficulty = e.currentTarget.dataset.diff;
            state.forcedChordTypeKey = null;
            if (state.difficulty === 'basic') {
                state.voicingType = 'close';
                if (el('voicingSelect')) el('voicingSelect').value = 'close';
                populatePracticeChordTypeSelect();
                showFeedbackBanner('🌱 <strong>Nivel Básico activado:</strong> Práctica a 3 voces (Tríadas: Mayor, Menor, Aumentado, Disminuido, Sus2, Sus4).', 'info');
            } else {
                populatePracticeChordTypeSelect();
            }
            if (el('practiceChordTypeSelect')) el('practiceChordTypeSelect').value = 'auto';
            document.querySelectorAll('.diff-btn').forEach(b => {
                b.className = 'diff-btn toolbar-btn ' + (b.dataset.diff === state.difficulty ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-800');
            });
            generateStandAloneExercise();
        }));

        // Punto 7: Reloj con tiempo de sesión personalizable
        if (el('timerModeSelect')) {
            el('timerModeSelect').addEventListener('change', e => {
                const val = e.target.value;
                const customInp = el('customSessionMinInput');
                if (val === 'session_custom') {
                    customInp?.classList.remove('hidden');
                    const mins = parseInt(customInp?.value || '15', 10) || 15;
                    state.timer.sessionLimitMinutes = mins;
                    state.timer.sessionEndTime = Date.now() + mins * 60000;
                    state.timer.limitSeconds = 0;
                } else if (val.startsWith('session_')) {
                    customInp?.classList.add('hidden');
                    const mins = parseInt(val.split('_')[1], 10) || 10;
                    state.timer.sessionLimitMinutes = mins;
                    state.timer.sessionEndTime = Date.now() + mins * 60000;
                    state.timer.limitSeconds = 0;
                } else {
                    customInp?.classList.add('hidden');
                    state.timer.sessionLimitMinutes = 0;
                    state.timer.sessionEndTime = null;
                    state.timer.limitSeconds = parseInt(val, 10) || 0;
                }
            });
        }
        if (el('customSessionMinInput')) {
            el('customSessionMinInput').addEventListener('change', e => {
                const mins = Math.max(1, parseInt(e.target.value, 10) || 15);
                state.timer.sessionLimitMinutes = mins;
                state.timer.sessionEndTime = Date.now() + mins * 60000;
                showFeedbackBanner(`⏳ Reloj de sesión configurado a ${mins} minutos.`, 'info');
            });
        }

        // Punto 7: Evaluar con opción personalizada
        if (el('evalBatchSelect')) {
            el('evalBatchSelect').addEventListener('change', e => {
                const val = e.target.value;
                const customEval = el('customEvalBatchInput');
                if (val === 'custom') {
                    customEval?.classList.remove('hidden');
                    state.evaluation.exercisesPerEval = Math.max(1, parseInt(customEval?.value || '8', 10) || 8);
                } else {
                    customEval?.classList.add('hidden');
                    state.evaluation.exercisesPerEval = parseInt(val, 10) || 0;
                }
                state.evaluation.questionsAttemptedInBatch = 0;
                updateDisplay();
            });
        }
        if (el('customEvalBatchInput')) {
            el('customEvalBatchInput').addEventListener('change', e => {
                state.evaluation.exercisesPerEval = Math.max(1, parseInt(e.target.value, 10) || 8);
                state.evaluation.questionsAttemptedInBatch = 0;
                updateDisplay();
            });
        }

        // Selector de tipo de acorde para práctica en barra principal
        if (el('practiceChordTypeSelect')) {
            populatePracticeChordTypeSelect();
            el('practiceChordTypeSelect').addEventListener('change', e => {
                const val = e.target.value;
                state.forcedChordTypeKey = val === 'auto' ? null : val;
                generateStandAloneExercise();
                const name = val === 'auto' ? 'Aleatorio por nivel' : (chordStructures[val]?.name || val);
                showFeedbackBanner(`🎸 Tipo de acorde para practicar: <strong>${name}</strong>.`, 'info');
            });
        }

        // Punto 6: Modificación en vivo y fluida de notas y acordes en el estudio
        const refreshLiveScaleSelect = () => {
            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
            const cur = notesList[selIdx] || notesList[0];
            const split = parseInt(el('liveEditBarSplitSelect')?.value || '1', 10);
            const t1 = el('liveEditChord1Type')?.value || 'maj7';
            const t2 = el('liveEditChord2Type')?.value || 'maj7';
            const activeType = (cur && cur.startBeatInBar >= 2 && split === 2) ? t2 : t1;
            const scaleSelect = el('liveEditChordScaleSelect');
            if (scaleSelect) {
                const scales = CHORD_SCALE_CONTEXT_CATALOG[activeType] || CHORD_SCALE_CONTEXT_CATALOG['maj7'] || [];
                scaleSelect.innerHTML = scales.map(sc => `<option value="${sc.id}">${sc.name}</option>`).join('');
                if (scales.length) scaleSelect.value = scales[0].id;
            }
        };

        const applyLiveChordModification = (showBanner = false) => {
            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
            const cur = notesList[selIdx] || notesList[0];
            if (!cur || !ex) return;
            const m = ex.measures[cur.measureIdx];
            if (!m) return;
            const split = parseInt(el('liveEditBarSplitSelect')?.value || '1', 10);
            const r1 = el('liveEditChord1Root')?.value || 'C';
            const t1 = el('liveEditChord1Type')?.value || 'maj7';
            const r2 = el('liveEditChord2Root')?.value || 'C';
            const t2 = el('liveEditChord2Type')?.value || 'maj7';
            const activeType = (cur.startBeatInBar >= 2 && split === 2) ? t2 : t1;
            const validScales = CHORD_SCALE_CONTEXT_CATALOG[activeType] || CHORD_SCALE_CONTEXT_CATALOG['maj7'] || [];
            let chosenScaleId = el('liveEditChordScaleSelect')?.value || null;
            if (!validScales.some(s => s.id === chosenScaleId)) {
                chosenScaleId = validScales[0]?.id || 'ionian';
            }
            m.chordRoot = r1;
            m.chordTypeKey = t1;
            m.scaleId = chosenScaleId;
            if (split === 2) {
                const s1 = (cur.startBeatInBar < 2) ? chosenScaleId : (m.harmonicRhythm?.[0]?.scaleId || (CHORD_SCALE_CONTEXT_CATALOG[t1]?.[0]?.id || 'ionian'));
                const s2 = (cur.startBeatInBar >= 2) ? chosenScaleId : (m.harmonicRhythm?.[1]?.scaleId || (CHORD_SCALE_CONTEXT_CATALOG[t2]?.[0]?.id || 'ionian'));
                m.harmonicRhythm = [
                    { root: r1, type: t1, startBeat: 0, durationBeats: 2, scaleId: s1 },
                    { root: r2, type: t2, startBeat: 2, durationBeats: 2, scaleId: s2 }
                ];
                m.chordSymbol = `${displayNote(r1)}${chordStructures[t1]?.cifrado || ''} - ${displayNote(r2)}${chordStructures[t2]?.cifrado || ''}`;
            } else {
                m.harmonicRhythm = [{ root: r1, type: t1, startBeat: 0, durationBeats: 4, scaleId: chosenScaleId }];
                m.chordSymbol = `${displayNote(r1)}${chordStructures[t1]?.cifrado || ''}`;
            }
            state.melodicStudio.autoFilledPhraseVoicings = {};
            renderMelodicStudioUI();
            if (showBanner) {
                showFeedbackBanner(`🎸 Acorde actualizado a ${m.chordSymbol}.`, 'success');
            }
        };

        if (el('liveEditBarSplitSelect')) {
            el('liveEditBarSplitSelect').addEventListener('change', e => {
                const isTwo = e.target.value === '2';
                el('liveEditChord2Group')?.classList.toggle('hidden', !isTwo);
                el('liveEditChord2Group')?.classList.toggle('inline-flex', isTwo);
                refreshLiveScaleSelect();
                applyLiveChordModification(false);
            });
        }
        if (el('liveEditChord1Type')) {
            el('liveEditChord1Type').addEventListener('change', () => {
                refreshLiveScaleSelect();
                applyLiveChordModification(false);
            });
        }
        if (el('liveEditChord1Root')) {
            el('liveEditChord1Root').addEventListener('change', () => applyLiveChordModification(false));
        }
        if (el('liveEditChord2Type')) {
            el('liveEditChord2Type').addEventListener('change', () => {
                refreshLiveScaleSelect();
                applyLiveChordModification(false);
            });
        }
        if (el('liveEditChord2Root')) {
            el('liveEditChord2Root').addEventListener('change', () => applyLiveChordModification(false));
        }
        if (el('liveEditChordScaleSelect')) {
            el('liveEditChordScaleSelect').addEventListener('change', () => applyLiveChordModification(false));
        }

        const completeMeasureWithRests = (curMeasure, maxBeats = 4) => {
            if (!curMeasure || !Array.isArray(curMeasure.notes)) return;
            const durCatalog = [
                { dur: 'w', b: 4 },
                { dur: 'hd', b: 3 },
                { dur: 'h', b: 2 },
                { dur: 'qd', b: 1.5 },
                { dur: 'q', b: 1 },
                { dur: '8d', b: 0.75 },
                { dur: 'qt', b: 2 / 3 },
                { dur: '8', b: 0.5 },
                { dur: '8t', b: 1 / 3 },
                { dur: '16', b: 0.25 },
                { dur: '16t', b: 1 / 6 }
            ];
            let used = curMeasure.notes.reduce((s, n) => s + getBeatsForDuration(n.dur), 0);
            let rem = +(maxBeats - used).toFixed(4);
            while (rem > 0.01) {
                const fitting = durCatalog.find(d => d.b <= rem + 0.001);
                if (!fitting) break;
                curMeasure.notes.push({
                    note: 'B/4',
                    dur: fitting.dur,
                    isRest: true,
                    isWeakBeat: false,
                    pOrS: 'P'
                });
                rem = +(rem - fitting.b).toFixed(4);
            }
        };

        const completeActiveBarWithRests = () => {
            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
            const cur = notesList[selIdx];
            if (!cur || !ex) return;
            const curMeasure = ex.measures[cur.measureIdx];
            if (!curMeasure) return;
            const timeSig = curMeasure.timeSignature || ex.timeSignature || '4/4';
            const maxBeats = parseInt(timeSig.split('/')[0], 10) || 4;
            const used = curMeasure.notes.reduce((s, n) => s + getBeatsForDuration(n.dur), 0);
            if (used >= maxBeats - 0.01) {
                showFeedbackBanner(`✅ El compás ${cur.bar} ya está completo (${used.toFixed(1)} / ${maxBeats}T).`, 'info');
                return;
            }
            completeMeasureWithRests(curMeasure, maxBeats);
            curMeasure.notes.forEach((n, idx) => {
                n.isWeakBeat = (n.dur === '8' || n.dur === '16') && (idx % 2 === 1);
                n.pOrS = n.isWeakBeat ? 'S' : 'P';
            });
            state.melodicStudio.autoFilledPhraseVoicings = {};
            renderMelodicStudioUI();
            showFeedbackBanner(`𝄽 Compás ${cur.bar} completado con silencios balanceados.`, 'success');
        };

        const applyLiveNoteModification = (showBanner = false) => {
            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
            const cur = notesList[selIdx];
            if (!cur || !ex) return;
            const curMeasure = ex.measures[cur.measureIdx];
            if (!curMeasure) return;
            const rawNote = curMeasure.notes[cur.noteIdxInMeasure];
            if (!rawNote) return;
            const pitchVal = el('liveEditPitchSelect')?.value || 'E';
            const octVal = el('liveEditOctaveSelect')?.value || '5';
            const durVal = el('liveEditDurSelect')?.value || 'q';

            const oldDur = rawNote.dur;
            const newDur = durVal;
            const oldBeats = getBeatsForDuration(oldDur);
            const newBeats = getBeatsForDuration(newDur);

            rawNote.dur = newDur;

            if (pitchVal === 'REST') {
                rawNote.isRest = true;
                delete state.melodicStudio.autoFilledPhraseVoicings[selIdx];
                if (el('liveEditOctaveSelect')) el('liveEditOctaveSelect').disabled = true;
            } else {
                rawNote.isRest = false;
                rawNote.note = `${pitchVal}/${octVal}`;
                if (el('liveEditOctaveSelect')) el('liveEditOctaveSelect').disabled = false;
                triggerUpperVoiceNotes([rawNote.note], "4n");
            }

            if (oldDur !== newDur) {
                const timeSig = curMeasure.timeSignature || ex.timeSignature || '4/4';
                const maxBeats = parseInt(timeSig.split('/')[0], 10) || 4;
                if (newBeats < oldBeats) {
                    // Si se cambia a una figura menor (ej. negra -> corchea), divide el pulso creando notas compañeras
                    // del mismo valor para que el usuario pueda escribir ambas notas sin desfasar ni añadir rellenos arbitrarios
                    const diff = +(oldBeats - newBeats).toFixed(4);
                    const count = Math.floor(diff / newBeats);
                    for (let k = 0; k < count; k++) {
                        curMeasure.notes.splice(cur.noteIdxInMeasure + 1 + k, 0, {
                            note: rawNote.note,
                            dur: newDur,
                            isRest: rawNote.isRest
                        });
                    }
                    completeMeasureWithRests(curMeasure, maxBeats);
                } else if (newBeats > oldBeats) {
                    // Si se cambia a una figura mayor (ej. corchea -> negra), absorbe las notas siguientes del compás que quepan
                    let needed = +(newBeats - oldBeats).toFixed(4);
                    let remIdx = cur.noteIdxInMeasure + 1;
                    while (needed > 0.001 && remIdx < curMeasure.notes.length) {
                        const nextB = getBeatsForDuration(curMeasure.notes[remIdx].dur);
                        if (nextB <= needed + 0.001) {
                            needed = +(needed - nextB).toFixed(4);
                            curMeasure.notes.splice(remIdx, 1);
                        } else {
                            const remNext = +(nextB - needed).toFixed(4);
                            const durCatalog = [
                                { dur: 'w', b: 4 },
                                { dur: 'hd', b: 3 },
                                { dur: 'h', b: 2 },
                                { dur: 'qd', b: 1.5 },
                                { dur: 'q', b: 1 },
                                { dur: '8d', b: 0.75 },
                                { dur: 'qt', b: 2 / 3 },
                                { dur: '8', b: 0.5 },
                                { dur: '8t', b: 1 / 3 },
                                { dur: '16', b: 0.25 },
                                { dur: '16t', b: 1 / 6 }
                            ];
                            const fitting = durCatalog.find(d => Math.abs(d.b - remNext) < 0.01);
                            if (fitting) {
                                curMeasure.notes[remIdx].dur = fitting.dur;
                            }
                            needed = 0;
                        }
                    }
                    completeMeasureWithRests(curMeasure, maxBeats);
                }
            }

            curMeasure.notes.forEach((n, idx) => {
                n.isWeakBeat = (n.dur === '8' || n.dur === '16') && (idx % 2 === 1);
                n.pOrS = n.isWeakBeat ? 'S' : 'P';
            });

            delete state.melodicStudio.enharmonicNoteSpellingByNote[selIdx];
            delete state.melodicStudio.selectedClassificationByNote[selIdx];
            delete state.melodicStudio.selectedHarmonizationByNote[selIdx];
            delete state.melodicStudio.manuallyClearedNotes[selIdx];
            delete rawNote.groupType;
            delete rawNote.defaultOpt;

            state.melodicStudio.selectedNoteIdx = selIdx;
            state.melodicStudio.autoFilledPhraseVoicings = {};
            renderMelodicStudioUI();
            if (showBanner) {
                showFeedbackBanner(
                    pitchVal === 'REST'
                        ? '𝄽 Silencio actualizado en la partitura.'
                        : `🎶 Nota actualizada a <strong>${formatScientificPitch(rawNote.note)}</strong> (${rawNote.dur}).`,
                    'success'
                );
            }
        };

        const liveAddNote = () => {
            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
            const cur = notesList[selIdx];
            if (!cur || !ex) return;
            const curMeasure = ex.measures[cur.measureIdx];
            if (!curMeasure) return;
            const pitchVal = el('liveEditPitchSelect')?.value || 'E';
            const octVal = el('liveEditOctaveSelect')?.value || '5';
            const durVal = el('liveEditDurSelect')?.value || '8';
            const isRest = pitchVal === 'REST';
            const noteStr = isRest ? 'B/4' : `${pitchVal}/${octVal}`;

            const newNote = {
                note: noteStr,
                dur: durVal,
                isRest: isRest,
                isWeakBeat: false,
                pOrS: 'P'
            };
            curMeasure.notes.splice(cur.noteIdxInMeasure + 1, 0, newNote);
            curMeasure.notes.forEach((n, idx) => {
                n.isWeakBeat = (n.dur === '8' || n.dur === '16') && (idx % 2 === 1);
                n.pOrS = n.isWeakBeat ? 'S' : 'P';
            });
            state.melodicStudio.autoFilledPhraseVoicings = {};
            state.melodicStudio.selectedNoteIdx = selIdx + 1;
            renderMelodicStudioUI();
            if (!isRest) triggerUpperVoiceNotes([newNote.note], "8n");
            showFeedbackBanner(`➕ Nueva nota <strong>${formatScientificPitch(newNote.note)}</strong> (${newNote.dur}) agregada al compás ${cur.bar}.`, 'success');
        };

        const liveDeleteNote = () => {
            const ex = getMelodicExampleById(state.melodicStudio.exampleId);
            const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
            const selIdx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
            const cur = notesList[selIdx];
            if (!cur || !ex) return;
            const curMeasure = ex.measures[cur.measureIdx];
            if (!curMeasure) return;
            const timeSig = curMeasure.timeSignature || ex.timeSignature || '4/4';
            const maxBeats = parseInt(timeSig.split('/')[0], 10) || 4;
            if (curMeasure.notes.length <= 1) {
                curMeasure.notes[0] = { note: 'B/4', dur: 'w', isRest: true, isWeakBeat: false, pOrS: 'P' };
                delete state.melodicStudio.autoFilledPhraseVoicings[selIdx];
                renderMelodicStudioUI();
                showFeedbackBanner(`𝄽 Compás ${cur.bar} convertido a silencio completo de 4 tiempos.`, 'info');
                return;
            }
            curMeasure.notes.splice(cur.noteIdxInMeasure, 1);
            completeMeasureWithRests(curMeasure, maxBeats);
            curMeasure.notes.forEach((n, idx) => {
                n.isWeakBeat = (n.dur === '8' || n.dur === '16') && (idx % 2 === 1);
                n.pOrS = n.isWeakBeat ? 'S' : 'P';
            });
            state.melodicStudio.autoFilledPhraseVoicings = {};
            state.melodicStudio.selectedNoteIdx = Math.max(0, selIdx - 1);
            renderMelodicStudioUI();
            showFeedbackBanner(`🗑️ Nota eliminada del compás ${cur.bar} y completado con silencios.`, 'info');
        };

        if (el('liveEditPitchSelect')) {
            el('liveEditPitchSelect').addEventListener('change', () => applyLiveNoteModification(false));
        }
        if (el('liveEditOctaveSelect')) {
            el('liveEditOctaveSelect').addEventListener('change', () => applyLiveNoteModification(false));
        }
        if (el('liveEditDurSelect')) {
            el('liveEditDurSelect').addEventListener('change', () => applyLiveNoteModification(false));
        }
        if (el('applyLiveNoteModBtn')) {
            el('applyLiveNoteModBtn').addEventListener('click', () => applyLiveNoteModification(true));
        }
        if (el('liveAddNoteBtn')) {
            el('liveAddNoteBtn').addEventListener('click', liveAddNote);
        }
        if (el('liveDeleteNoteBtn')) {
            el('liveDeleteNoteBtn').addEventListener('click', liveDeleteNote);
        }
        if (el('completeLiveBarWithRestsBtn')) {
            el('completeLiveBarWithRestsBtn').addEventListener('click', completeActiveBarWithRests);
        }
        if (el('liveBarBeatBalanceBadge')) {
            el('liveBarBeatBalanceBadge').addEventListener('click', completeActiveBarWithRests);
        }
        if (el('applyLiveChordModBtn')) {
            el('applyLiveChordModBtn').addEventListener('click', () => applyLiveChordModification(true));
        }

        if (el('mechanicalApproachBtn')) {
            el('mechanicalApproachBtn').addEventListener('click', () => {
                state.melodicStudio.isActive = !state.melodicStudio.isActive;
                if (state.melodicStudio.isActive) {
                    state.continuityMode = false;
                    renderContinuityPanel();
                    state.melodicStudio.selectedNoteIdx = 0;
                }
                el('mechanicalApproachBtn').classList.toggle('bg-emerald-600', state.melodicStudio.isActive);
                el('mechanicalApproachBtn').classList.toggle('text-white', state.melodicStudio.isActive);
                renderMelodicStudioUI();
            });
        }

        if (el('continuityModeBtn')) {
            el('continuityModeBtn').addEventListener('click', () => {
                state.continuityMode = !state.continuityMode;
                if (state.continuityMode) {
                    state.melodicStudio.isActive = false;
                    el('mechanicalApproachBtn')?.classList.remove('bg-emerald-600', 'text-white');
                    renderMelodicStudioUI();
                    generateContinuity8Bars();
                } else {
                    renderContinuityPanel();
                    generateStandAloneExercise();
                }
                el('continuityModeBtn').classList.toggle('bg-teal-600', state.continuityMode);
                el('continuityModeBtn').classList.toggle('text-white', state.continuityMode);
            });
        }

        if (el('cifradoToggle') && el('pianoToggle')) {
            el('cifradoToggle').addEventListener('click', () => {
                el('noteBuildingControls')?.classList.remove('hidden');
                el('piano-container')?.classList.add('hidden');
            });
            el('pianoToggle').addEventListener('click', () => {
                el('noteBuildingControls')?.classList.add('hidden');
                el('piano-container')?.classList.remove('hidden');
            });
        }

        if (el('confirmAnswerButton')) {
            el('confirmAnswerButton').addEventListener('click', () => {
                const exp = state.correctNotes.length;
                if (state.selectedUserNotes.length < exp) {
                    showFeedbackBanner(`⚠️ Completa todas las voces (${state.selectedUserNotes.length}/${exp}) antes de confirmar.`, 'error');
                    return;
                }
                let allOk = true;
                for (let i = 1; i < exp; i++) {
                    const u = state.selectedUserNotes[i];
                    const uName = u ? u.split('/')[0] : '';
                    if (u && getNoteSemitone(uName) === getNoteSemitone(state.correctNotes[i])) {
                        state.validatedCells[i] = (state.strictEnharmonic && uName !== state.correctNotes[i]) ? 'enharmonic' : 'correct';
                    } else {
                        state.validatedCells[i] = 'error';
                        allOk = false;
                    }
                }

                // Punto 10: En Continuidad Armónica los 8 compases se evalúan como uno solo y se guardan en el Historial al completarse
                if (state.continuityMode) {
                    const curBarObj = state.continuity.measures[state.continuity.currentBar];
                    if (curBarObj) curBarObj.attemptsOnBar = (curBarObj.attemptsOnBar || 0) + 1;
                    if (allOk) {
                        if (curBarObj && !curBarObj.completed) {
                            curBarObj.completed = true;
                            curBarObj.solvedNotes = [...state.correctNotesWithOctave];
                            state.continuity.runHits++;
                        }
                        state.continuity.previousVoicesWithOctave = [...state.correctNotesWithOctave];
                        playNotesList(state.correctNotesWithOctave);
                        renderContinuityPanel();
                        updateDisplay();

                        const all8Completed = state.continuity.measures.every(m => m.completed);
                        if (all8Completed) {
                            registerDailyPracticeActivity();
                            state.stats.totalExercises++;
                            state.stats.totalCorrect++;
                            state.stats.currentStreak++;
                            state.stats.xp = (state.stats.xp || 0) + 50;
                            state.currentSession.correct++;
                            state.currentSession.xpEarned = (state.currentSession.xpEarned || 0) + 50;
                            state.currentSession.currentSessionStreak++;
                            state.currentSession.bestSessionStreak = Math.max(state.currentSession.bestSessionStreak || 0, state.currentSession.currentSessionStreak);
                            if (!state.stats.competencies) state.stats.competencies = {};
                            if (!state.stats.competencies.continuity8C) state.stats.competencies.continuity8C = { correct: 0, total: 0 };
                            state.stats.competencies.continuity8C.total++;
                            state.stats.competencies.continuity8C.correct++;

                            const now = new Date();
                            const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' + now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            if (!Array.isArray(state.stats.continuityHistory)) state.stats.continuityHistory = [];
                            state.stats.continuityHistory.unshift({
                                id: 'cont_' + Date.now(),
                                date: dateStr,
                                hits: state.continuity.runHits,
                                errors: state.continuity.runErrors,
                                retries: state.continuity.runRetries,
                                measures: JSON.parse(JSON.stringify(state.continuity.measures))
                            });
                            rpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63();
                            const saved = savePersistedState();
                            unlockBadge('continuity_8c');
                            showFeedbackBanner(
                                saved === false
                                    ? '🎉 ¡Completaste los 8 compases! No se pudo guardar el progreso del perfil.'
                                    : '🎉 ¡Completaste los 8 compases! Guardado en tu Historial y abriendo partitura del enlace...',
                                saved === false ? 'error' : 'success'
                            );
                            setTimeout(() => openContinuitySummaryModal(0), 450);
                        } else {
                            showFeedbackBanner(`✅ Compás ${state.continuity.currentBar + 1}/8 correcto. Pasando al siguiente compás...`, 'success');
                            setTimeout(() => loadContinuityBar(state.continuity.currentBar + 1), 650);
                        }
                    } else {
                        state.continuity.runErrors++;
                        state.continuity.runRetries++;
                        if (curBarObj) curBarObj.errorsOnBar = (curBarObj.errorsOnBar || 0) + 1;
                        renderContinuityPanel();
                        updateDisplay();
                        showFeedbackBanner('❌ Hay voces incorrectas en este compás. Corrígelas para avanzar en el enlace de 8 compases.', 'error');
                    }
                    return;
                }

                if (allOk) {
                    const elapsed = (Date.now() - state.timer.exerciseStartTime) / 1000;
                    state.exerciseSolved = true;
                    registerDailyPracticeActivity();
                    state.stats.totalExercises++;
                    if (!state.failedCurrentExercise) {
                        state.stats.totalCorrect++;
                        state.stats.currentStreak++;
                        state.stats.xp = (state.stats.xp || 0) + 15;
                        state.currentSession.correct++;
                        state.currentSession.xpEarned = (state.currentSession.xpEarned || 0) + 15;
                        state.currentSession.currentSessionStreak++;
                        state.currentSession.bestSessionStreak = Math.max(state.currentSession.bestSessionStreak || 0, state.currentSession.currentSessionStreak);
                        state.evaluation.batchCorrectFirstTry++;
                    }
                    if (elapsed > 0 && elapsed < 180) {
                        state.currentSession.totalTimeSec += elapsed;
                        state.currentSession.timedCount++;
                    }
                    rpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63();
                    const compKey = state.melodicStudio.isActive ? 'melodicApproaches' : (state.dictationMode ? 'earDictation' : (state.voicingType === 'close' ? 'close4Way' : 'openDropsSpreads'));
                    if (state.stats.competencies && state.stats.competencies[compKey]) {
                        state.stats.competencies[compKey].total++;
                        if (!state.failedCurrentExercise) state.stats.competencies[compKey].correct++;
                    }
                    unlockBadge('first_chord');
                    if (state.stats.totalCorrect >= 10) unlockBadge('triad_master');
                    if (state.stats.dailyStreak >= 3 || state.currentSession.bestSessionStreak >= 3) unlockBadge('streak_3');
                    if (state.difficulty === 'advanced') unlockBadge('tension_explorer');
                    if (state.isCustomChallenge) unlockBadge('custom_creator');
                    if (state.dictationMode) unlockBadge('ear_master');
                    if (state.voicingType !== 'close' || state.includeBass) unlockBadge('drop_arranger');

                    const saved = savePersistedState();
                    state.evaluation.questionsAttemptedInBatch++;
                    playNotesList(state.correctNotesWithOctave);
                    showFeedbackBanner(
                        saved === false
                            ? '✅ ¡Correcto! No se pudo guardar el progreso del perfil.'
                            : '✅ ¡Correcto! (+15 XP). Pulsa Enter o Siguiente Ejercicio para continuar.',
                        saved === false ? 'error' : 'success'
                    );

                    const evalTarget = state.evaluation.exercisesPerEval || 0;
                    if (evalTarget > 0 && state.evaluation.questionsAttemptedInBatch >= evalTarget && !state.melodicStudio.isActive) {
                        setTimeout(() => {
                            const pct = Math.round((state.evaluation.batchCorrectFirstTry / evalTarget) * 100);
                            if (el('evalBatchSizeTag')) el('evalBatchSizeTag').textContent = `${evalTarget} Ejercicios`;
                            if (el('evaluationSummary')) {
                                el('evaluationSummary').innerHTML = buildFullGamifiedSessionReportHTML(true);
                            }
                            if (el('adviceList')) {
                                el('adviceList').innerHTML = `<li>Precisión de la tanda: <strong>${pct}%</strong> (${state.evaluation.batchCorrectFirstTry}/${evalTarget} al primer intento).</li><li>Al continuar o terminar sesión se inicia automáticamente un nuevo ejercicio.</li>`;
                            }
                            state.evaluation.questionsAttemptedInBatch = 0;
                            state.evaluation.batchCorrectFirstTry = 0;
                            generateStandAloneExercise();
                            el('evaluationModalOverlay')?.classList.add('visible');
                        }, 550);
                    }
                } else {
                    state.failedCurrentExercise = true;
                    state.stats.totalIncorrect++;
                    state.stats.currentStreak = 0;
                    state.currentSession.incorrect++;
                    state.currentSession.currentSessionStreak = 0;
                    if (!state.stats.errorBank) state.stats.errorBank = [];
                    const exId = `${state.chordRoot}|${state.chordTypeKey}|${state.givenLabel}`;
                    if (!state.stats.errorBank.some(x => x.id === exId)) {
                        state.stats.errorBank.push({ id: exId, root: state.chordRoot, chordTypeKey: state.chordTypeKey, leadLabel: state.givenLabel });
                    }
                    const saved = savePersistedState();
                    showFeedbackBanner(
                        saved === false
                            ? '❌ Revisa las celdas marcadas en rojo. No se pudo guardar el progreso del perfil.'
                            : '❌ Revisa las celdas marcadas en rojo (añadido a tu Banco de Errores 🔄).',
                        'error'
                    );
                }
                updateDisplay();
            });
        }

        if (el('playContinuity4VoicesOnlyBtn')) el('playContinuity4VoicesOnlyBtn').addEventListener('click', () => playContinuitySequence(false));
        if (el('playFullContinuityBtn')) el('playFullContinuityBtn').addEventListener('click', () => playContinuitySequence(true));
        if (el('finishContinuityAndGenerateNewBtn')) {
            el('finishContinuityAndGenerateNewBtn').addEventListener('click', () => {
                el('continuitySummaryModalOverlay')?.classList.remove('visible');
                generateContinuity8Bars();
                showFeedbackBanner('🎲 Se ha generado un nuevo ejercicio de 8 compases de Continuidad Armónica.', 'info');
            });
        }
        if (el('closeContinuitySummaryBtn')) el('closeContinuitySummaryBtn').addEventListener('click', () => el('continuitySummaryModalOverlay')?.classList.remove('visible'));
        if (el('openContinuitySummaryBtn')) el('openContinuitySummaryBtn').addEventListener('click', openContinuitySummaryModal);
        if (el('newContinuityProgBtn')) el('newContinuityProgBtn').addEventListener('click', generateContinuity8Bars);

        if (el('undoLastNoteButton')) el('undoLastNoteButton').addEventListener('click', () => {
            if (state.selectedUserNotes.length > 1) { state.selectedUserNotes.pop(); updateDisplay(); }
        });
        if (el('clearAllSelectionButton')) el('clearAllSelectionButton').addEventListener('click', () => {
            state.selectedUserNotes = [state.givenNoteWithOctave];
            state.validatedCells = [null, null, null, null, null];
            updateDisplay();
        });
        if (el('hintButton')) el('hintButton').addEventListener('click', () => {
            const idx = state.selectedUserNotes.length < state.correctNotes.length ? state.selectedUserNotes.length : 1;
            if (el('hintModalBody')) el('hintModalBody').innerHTML = `En la <strong>${idx + 1}ª voz (${state.orderedLabelsForDisplay[idx]})</strong> va la nota <strong>${displayNote(state.correctNotes[idx])}</strong>.`;
            el('hintModalOverlay')?.classList.add('visible');
        });
        if (el('hintModalCloseButton')) el('hintModalCloseButton').addEventListener('click', () => el('hintModalOverlay')?.classList.remove('visible'));
        if (el('showAnswerButton')) el('showAnswerButton').addEventListener('click', () => {
            state.selectedUserNotes = [...state.correctNotesWithOctave];
            state.validatedCells = state.correctNotes.map((_, i) => i > 0 ? 'correct' : null);
            state.exerciseSolved = true;
            updateDisplay();
            playNotesList(state.correctNotesWithOctave);
        });
        if (el('changeQuestionButton')) el('changeQuestionButton').addEventListener('click', generateStandAloneExercise);
        if (el('replayAudioButton')) el('replayAudioButton').addEventListener('click', () => playNotesList(state.selectedUserNotes.length > 1 ? state.selectedUserNotes : state.correctNotesWithOctave));
        if (el('pdfReferenceBtn')) el('pdfReferenceBtn').addEventListener('click', () => el('pdfReferenceModalOverlay')?.classList.add('visible'));
        if (el('closePdfReferenceBtn')) el('closePdfReferenceBtn').addEventListener('click', () => el('pdfReferenceModalOverlay')?.classList.remove('visible'));
        if (el('shortcutsButton')) el('shortcutsButton').addEventListener('click', () => el('shortcutsModalOverlay')?.classList.add('visible'));
        if (el('closeShortcutsButton')) el('closeShortcutsButton').addEventListener('click', () => el('shortcutsModalOverlay')?.classList.remove('visible'));
        if (el('continueTrainingButton')) el('continueTrainingButton').addEventListener('click', () => {
            el('evaluationModalOverlay')?.classList.remove('visible');
            generateStandAloneExercise();
        });
        if (el('endSessionButton') || el('endSessionTopBtn')) {
            [el('endSessionButton'), el('endSessionTopBtn')].forEach(b => b?.addEventListener('click', () => {
                el('evaluationModalOverlay')?.classList.remove('visible');
                el('mainAppContainer')?.classList.add('hidden');
                if (el('resultsContentToCapture')) {
                    el('resultsContentToCapture').innerHTML = buildFullGamifiedSessionReportHTML(true);
                }
                el('finalMessageDisplay')?.classList.remove('hidden');
            }));
        }
        if (el('changeUserFromFinalBtn')) el('changeUserFromFinalBtn').addEventListener('click', () => {
            populateWelcomeUserSelect();
            el('finalMessageDisplay')?.classList.add('hidden');
            el('welcomeModalOverlay')?.classList.add('visible');
        });
        if (el('resumePracticeFromFinalBtn')) el('resumePracticeFromFinalBtn').addEventListener('click', () => {
            state.currentSession = createEmptySession();
            el('finalMessageDisplay')?.classList.add('hidden');
            el('mainAppContainer')?.classList.remove('hidden');
            generateStandAloneExercise();
        });
        if (el('saveAsPdfButton')) {
            el('saveAsPdfButton').addEventListener('click', async () => {
                const target = el('resultsContentToCapture');
                if (!target || typeof html2canvas === 'undefined' || !window.jspdf) return;
                try {
                    const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2 });
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const w = pdf.internal.pageSize.getWidth() - 20;
                    const h = (canvas.height * w) / canvas.width;
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 15, w, Math.min(h, 265));
                    pdf.save(`reporte_sesion_${state.currentUser}.pdf`);
                } catch (e) {}
            });
        }
        if (el('generateRandomMelodyBtn')) el('generateRandomMelodyBtn').addEventListener('click', () => generateRandomMelodicPhrase(state.melodicStudio.barsCount));

        // Navegación e interacción completa en Armonizaciones & Análisis Melódico
        if (el('melodicPhraseCanvas')) {
            el('melodicPhraseCanvas').addEventListener('click', e => {
                const canvas = el('melodicPhraseCanvas');
                canvas.focus({ preventScroll: true });
                const rect = canvas.getBoundingClientRect();
                const logicalW = parseFloat(canvas.dataset.logicalWidth) || canvas.width || 1140;
                const logicalH = parseFloat(canvas.dataset.logicalHeight) || canvas.height || 310;
                const x = (e.clientX - rect.left) * (logicalW / rect.width);
                const y = (e.clientY - rect.top) * (logicalH / rect.height);
                const hit = (state.melodicStudio.noteHitBoxes || []).find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
                if (hit) {
                    state.melodicStudio.selectedNoteIdx = hit.globalIdx;
                    const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                    const nObj = notesList[hit.globalIdx];
                    const comp = state.melodicStudio.autoFilledPhraseVoicings[hit.globalIdx];
                    if (nObj && !nObj.isRest) {
                        if (comp && comp.notesWithOct && comp.notesWithOct.length) playNotesList(comp.notesWithOct, comp.implicitBassNote);
                        else triggerUpperVoiceNotes([nObj.note], "4n");
                    }
                    renderMelodicStudioUI();
                }
            });
        }
        if (el('prevMelodicNoteBtn')) {
            el('prevMelodicNoteBtn').addEventListener('click', () => navigateMelodicStudioNote(-1));
        }
        if (el('nextMelodicNoteBtn')) {
            el('nextMelodicNoteBtn').addEventListener('click', () => navigateMelodicStudioNote(1));
        }
        if (el('dockSideFloatingModalBtn')) {
            el('dockSideFloatingModalBtn').addEventListener('click', () => {
                const modal = el('floatingHarmonizationModal');
                if (!modal) return;
                state.melodicStudio.floatingDockSide = state.melodicStudio.floatingDockSide === 'left' ? 'right' : 'left';
                modal.style.left = state.melodicStudio.floatingDockSide === 'left' ? '16px' : 'auto';
                modal.style.right = state.melodicStudio.floatingDockSide === 'right' ? '16px' : 'auto';
            });
        }
        if (el('closeFloatingHarmonizationModalBtn')) {
            el('closeFloatingHarmonizationModalBtn').addEventListener('click', () => {
                const noteIdx = state.melodicStudio.selectedNoteIdx;
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                const curNote = notesList[noteIdx];
                if (curNote && !curNote.isRest) {
                    const activeCl = curNote.activeClassObj || curNote.classifications[0];
                    const availableTechniques = [
                        ...(activeCl.options || []),
                        ...(activeCl.separateIndLeadOptions || []),
                        ...(activeCl.separateTonicOptions || [])
                    ];
                    const savedTech = state.melodicStudio.selectedHarmonizationByNote[curNote.globalIdx];
                    const chosenTech = savedTech && availableTechniques.includes(savedTech)
                        ? savedTech
                        : (activeCl.defaultOpt || (activeCl.options || [])[0]);
                    const comp = computeHarmonizationForMelodicNote(curNote, chosenTech);
                    loadHarmonizationIntoMainBlock(curNote, comp);
                }
                state.melodicStudio.selectedNoteIdx = null;
                renderMelodicStudioUI();
                updateDisplay();
                el('displaySection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        if (el('studioLen4Btn')) {
            el('studioLen4Btn').addEventListener('click', () => {
                stopStudioPhrasePlayback();
                state.melodicStudio.barsCount = 4;
                state.melodicStudio.exampleId = 'f3_4_1';
                state.melodicStudio.selectedNoteIdx = 0;
                state.melodicStudio.enharmonicNoteSpellingByNote = {};
                state.melodicStudio.manuallyClearedNotes = {};
                state.melodicStudio.selectedHarmonizationByNote = {};
                state.melodicStudio.autoFilledPhraseVoicings = {};
                el('studioLen4Btn').className = 'toolbar-btn bg-emerald-600 text-white';
                if (el('studioLen8Btn')) el('studioLen8Btn').className = 'toolbar-btn bg-white text-slate-800';
                populateMelodicStudioExamplesDropdown();
                renderMelodicStudioUI();
            });
        }
        if (el('studioLen8Btn')) {
            el('studioLen8Btn').addEventListener('click', () => {
                stopStudioPhrasePlayback();
                state.melodicStudio.barsCount = 8;
                state.melodicStudio.exampleId = 'f3_8_1';
                state.melodicStudio.selectedNoteIdx = 0;
                state.melodicStudio.enharmonicNoteSpellingByNote = {};
                state.melodicStudio.manuallyClearedNotes = {};
                state.melodicStudio.selectedHarmonizationByNote = {};
                state.melodicStudio.autoFilledPhraseVoicings = {};
                el('studioLen8Btn').className = 'toolbar-btn bg-emerald-600 text-white';
                if (el('studioLen4Btn')) el('studioLen4Btn').className = 'toolbar-btn bg-white text-slate-800';
                populateMelodicStudioExamplesDropdown();
                renderMelodicStudioUI();
            });
        }
        if (el('melodicExampleSelect')) {
            el('melodicExampleSelect').addEventListener('change', e => {
                stopStudioPhrasePlayback();
                state.melodicStudio.exampleId = e.target.value;
                state.melodicStudio.selectedNoteIdx = 0;
                state.melodicStudio.enharmonicNoteSpellingByNote = {};
                state.melodicStudio.manuallyClearedNotes = {};
                state.melodicStudio.selectedHarmonizationByNote = {};
                state.melodicStudio.autoFilledPhraseVoicings = {};
                renderMelodicStudioUI();
            });
        }
        if (el('playMelodyOnlyBtn')) el('playMelodyOnlyBtn').addEventListener('click', () => playStudioPhrase(0, true));
        if (el('playFullMelodicPhraseBtn')) el('playFullMelodicPhraseBtn').addEventListener('click', () => playStudioPhrase(0, false));
        if (el('playFromActiveNoteBtn')) {
            el('playFromActiveNoteBtn').addEventListener('click', () => {
                const start = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
                playStudioPhrase(start, false);
            });
        }
        if (el('studioTempoRange')) {
            el('studioTempoRange').addEventListener('input', e => setStudioTempo(e.target.value));
        }
        if (el('studioTempoInput')) {
            el('studioTempoInput').addEventListener('input', e => {
                if (e.target.value !== '') setStudioTempo(e.target.value);
            });
            el('studioTempoInput').addEventListener('change', e => setStudioTempo(e.target.value));
            el('studioTempoInput').addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    setStudioTempo(e.currentTarget.value);
                    e.currentTarget.blur();
                }
            });
        }
        document.querySelectorAll('[data-studio-tempo]').forEach(button => {
            button.addEventListener('click', () => setStudioTempo(button.dataset.studioTempo));
        });
        if (el('clearSingleNoteBlockBtn')) {
            el('clearSingleNoteBlockBtn').addEventListener('click', () => {
                const idx = state.melodicStudio.selectedNoteIdx;
                if (idx === null) {
                    showFeedbackBanner('⚠️ Selecciona primero una nota en la partitura para borrar su bloque.', 'info');
                    return;
                }
                state.melodicStudio.manuallyClearedNotes[idx] = true;
                delete state.melodicStudio.autoFilledPhraseVoicings[idx];
                delete state.melodicStudio.selectedHarmonizationByNote[idx];
                renderMelodicStudioUI();
                showFeedbackBanner('🧹 Bloque borrado en la nota seleccionada; no se rellenará automáticamente.', 'info');
            });
        }
        if (el('clearAllPhraseBlocksBtn')) {
            el('clearAllPhraseBlocksBtn').addEventListener('click', () => {
                stopStudioPhrasePlayback();
                state.melodicStudio.stepByStepMode = true;
                state.melodicStudio.autoFilledPhraseVoicings = {};
                state.melodicStudio.selectedNoteIdx = 0;
                renderMelodicStudioUI();
                showFeedbackBanner('🧩 Frase limpia. Haz clic en cada nota para armar su bloque.', 'info');
            });
        }
        if (el('autoFillAllPhraseBtn')) {
            el('autoFillAllPhraseBtn').addEventListener('click', applySmartAnalysisAutoFill);
        }
        if (el('toggleScoreVoicingViewBtn')) {
            el('toggleScoreVoicingViewBtn').addEventListener('click', () => {
                state.melodicStudio.showFullVoicingInScore = !state.melodicStudio.showFullVoicingInScore;
                el('toggleScoreVoicingViewBtn').textContent = state.melodicStudio.showFullVoicingInScore ? '🎼 Vista: Melodía + Bloque' : '🎵 Vista: Solo Melodía';
                drawMelodicPhraseScore(-1);
            });
        }
        if (el('toggleApproachNotationBtn')) {
            el('toggleApproachNotationBtn').addEventListener('click', () => {
                state.melodicStudio.approachNotation = state.melodicStudio.approachNotation === 'S' ? 'd' : 'S';
                renderMelodicStudioUI();
            });
        }
        if (el('toggleSelectedNoteEnharmonicBtn')) {
            el('toggleSelectedNoteEnharmonicBtn').addEventListener('click', () => {
                const selectedIdx = state.melodicStudio.selectedNoteIdx;
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                const selected = notesList[selectedIdx];
                if (!selected || selected.isRest) return;

                if (state.melodicStudio.enharmonicNoteSpellingByNote[selectedIdx]) {
                    delete state.melodicStudio.enharmonicNoteSpellingByNote[selectedIdx];
                } else {
                    const contextualSpelling = getContextualEnharmonicSpelling(selected);
                    if (!contextualSpelling) return;
                    state.melodicStudio.enharmonicNoteSpellingByNote[selectedIdx] = contextualSpelling;
                }

                const selectedTechnique = state.melodicStudio.selectedHarmonizationByNote[selectedIdx]
                    || selected.activeClassObj?.defaultOpt
                    || 'principal_4way';
                getGroupIndicesForHarmonization(selected, selectedTechnique, notesList).forEach(globalIdx => {
                    delete state.melodicStudio.autoFilledPhraseVoicings[globalIdx];
                });
                renderMelodicStudioUI();
            });
        }
        if (el('scoreAnnotationModeSelect')) {
            el('scoreAnnotationModeSelect').addEventListener('change', e => {
                state.melodicStudio.scoreAnnotationMode = e.currentTarget.value;
                drawMelodicPhraseScore(-1);
            });
        }
        if (el('toggleScoreZoomBtn')) {
            el('toggleScoreZoomBtn').addEventListener('click', () => {
                state.melodicStudio.measuresPerRowMode = state.melodicStudio.measuresPerRowMode === 4 ? 2 : 4;
                el('toggleScoreZoomBtn').textContent = state.melodicStudio.measuresPerRowMode === 4
                    ? '📐 Compases: 4C/fila'
                    : '📐 Compases: 2C/fila';
                drawMelodicPhraseScore(-1);
            });
        }
        if (el('clearNotePermutationsBtn')) {
            el('clearNotePermutationsBtn').addEventListener('click', () => {
                const idx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
                state.melodicStudio.selectedMultiPermutationsByNote[idx] = [];
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                if (notesList[idx]) {
                    state.melodicStudio.autoFilledPhraseVoicings[idx] = computeHarmonizationForMelodicNote(notesList[idx]);
                }
                renderMelodicStudioUI();
            });
        }
        if (el('applyAndNextNoteBtn')) {
            el('applyAndNextNoteBtn').addEventListener('click', () => {
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                const idx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
                const cur = notesList[idx];
                if (!cur) return;
                const comp = computeHarmonizationForMelodicNote(cur);
                state.melodicStudio.autoFilledPhraseVoicings[idx] = comp;
                playNotesList(comp.notesWithOct, comp.implicitBassNote);
                state.melodicStudio.selectedNoteIdx = (idx + 1) % notesList.length;
                renderMelodicStudioUI();
            });
        }
        if (el('loadNoteForManualPracticeBtn')) {
            el('loadNoteForManualPracticeBtn').addEventListener('click', () => {
                state.selectedUserNotes = [...state.correctNotesWithOctave];
                state.validatedCells = state.correctNotesWithOctave.map((_, index) => index > 0 ? 'correct' : null);
                state.editingCellIndex = null;
                updateDisplay();
                el('displaySection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        if (el('playSelectedNoteVoicingBtn')) {
            el('playSelectedNoteVoicingBtn').addEventListener('click', () => playNotesList(state.correctNotesWithOctave));
        }
        if (el('saveStudioMelodyBtn')) {
            el('saveStudioMelodyBtn').addEventListener('click', () => {
                const curEx = getMelodicExampleById(state.melodicStudio.exampleId);
                if (!curEx) return;
                const cloned = JSON.parse(JSON.stringify(curEx));
                const savedId = 'saved_' + Date.now();
                cloned.id = savedId;
                cloned.title = `💾 Guardada (${cloned.bars}C): ` + cloned.measures.map(m => m.chordSymbol).join(' | ');
                state.melodicStudio.customRandomExamples[savedId] = cloned;
                state.melodicStudio.exampleId = savedId;
                state.melodicStudio.enharmonicNoteSpellingByNote = {};
                state.melodicStudio.manuallyClearedNotes = {};
                const saved = savePersistedState();
                populateMelodicStudioExamplesDropdown();
                showFeedbackBanner(
                    saved === true
                        ? '💾 Melodía y armonización guardadas en tu selector de ejemplos.'
                        : (saved === null
                            ? '💾 Melodía disponible durante esta sesión de invitado; inicia un perfil para conservarla.'
                            : '⚠️ La melodía está disponible en esta sesión, pero no se pudo guardar en el perfil.'),
                    saved === false ? 'error' : (saved === null ? 'info' : 'success')
                );
            });
        }
        if (el('exportStudioXmlBtn')) {
            el('exportStudioXmlBtn').addEventListener('click', exportStudioScoreToMusicXML);
        }
        if (el('exportStudioMidiBtn')) {
            el('exportStudioMidiBtn').addEventListener('click', exportStudioScoreToMidi);
        }
        if (el('loopActiveBarBtn')) {
            el('loopActiveBarBtn').addEventListener('click', () => {
                state.melodicStudio.isLoopingBar = !state.melodicStudio.isLoopingBar;
                el('loopActiveBarBtn').classList.toggle('bg-purple-800', state.melodicStudio.isLoopingBar);
                el('loopActiveBarBtn').classList.toggle('ring-2', state.melodicStudio.isLoopingBar);
                el('loopActiveBarBtn').classList.toggle('ring-purple-300', state.melodicStudio.isLoopingBar);
                showFeedbackBanner(state.melodicStudio.isLoopingBar ? '🔁 Modo Bucle de compás activo encendido.' : '⏹️ Modo Bucle de compás apagado.', 'info');
                if (state.melodicStudio.isLoopingBar && !state.melodicStudio.isPlayingPhrase) {
                    playStudioPhrase(state.melodicStudio.selectedNoteIdx || 0, false);
                }
            });
        }
        if (el('studioSwingSelect')) {
            el('studioSwingSelect').addEventListener('change', e => {
                state.melodicStudio.swingMode = e.target.value;
                showFeedbackBanner(`🎷 Articulación rítmica: ${state.melodicStudio.swingMode === 'swing' ? 'Swing Jazz (Corcheas apaisadas)' : 'Directo (Straight)'}.`, 'info');
            });
        }
        if (el('studioMetronomeToggle')) {
            el('studioMetronomeToggle').addEventListener('change', e => {
                state.melodicStudio.metronomeActive = e.target.checked;
                showFeedbackBanner(state.melodicStudio.metronomeActive ? '🥁 Claqueta en tiempos 2 y 4 activada.' : '🥁 Claqueta desactivada.', 'info');
            });
        }
        if (el('toggleVoiceLeadingLinesBtn')) {
            el('toggleVoiceLeadingLinesBtn').addEventListener('click', () => {
                state.melodicStudio.showVoiceLeadingLines = !state.melodicStudio.showVoiceLeadingLines;
                el('toggleVoiceLeadingLinesBtn').classList.toggle('bg-cyan-600', state.melodicStudio.showVoiceLeadingLines);
                el('toggleVoiceLeadingLinesBtn').classList.toggle('text-white', state.melodicStudio.showVoiceLeadingLines);
                drawMelodicPhraseScore(-1);
            });
        }
        if (el('studioUndoBtn')) {
            el('studioUndoBtn').addEventListener('click', undoStudioAction);
        }
        if (el('studioRedoBtn')) {
            el('studioRedoBtn').addEventListener('click', redoStudioAction);
        }
        if (el('exportStudioPdfBtn')) {
            el('exportStudioPdfBtn').addEventListener('click', () => {
                const canvas = el('melodicPhraseCanvas');
                if (!canvas || !window.jspdf) return;
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
                const pageW = doc.internal.pageSize.getWidth() - 40;
                const pageH = (canvas.height * pageW) / canvas.width;
                doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, 20, pageW, Math.min(pageH, 540));
                doc.save('armonizacion_melodica.pdf');
            });
        }
        if (el('exportUserDataJsonBtn')) {
            el('exportUserDataJsonBtn').addEventListener('click', () => {
                const payload = {
                    version: 'BloqueArmonicoPro_v4',
                    exportedAt: new Date().toISOString(),
                    currentUser: state.currentUser,
                    stats: state.stats,
                    currentSession: state.currentSession,
                    customRandomExamples: state.melodicStudio.customRandomExamples
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `respaldo_${state.currentUser}_BloqueArmonicoPro.json`;
                a.click();
                showFeedbackBanner('📤 Datos del perfil y melodías exportados en formato .JSON.', 'success');
            });
        }
        if (el('importUserDataJsonInput')) {
            el('importUserDataJsonInput').addEventListener('change', e => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(String(ev.target?.result || '{}'));
                        if (!data || typeof data !== 'object' || Array.isArray(data)) {
                            throw new Error('El respaldo no tiene un formato válido.');
                        }
                        const importedUser = typeof data.currentUser === 'string' && data.currentUser.trim()
                            ? data.currentUser.trim()
                            : (state.currentUser === 'Invitado' ? 'Estudiante' : state.currentUser);
                        try {
                            registerUserProfile(importedUser);
                        } catch (error) {
                            reportProfileStorageError('registrar', error);
                            return;
                        }
                        state.currentUser = importedUser;
                        loadUserProfileStats(importedUser);
                        if (data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)) {
                            const importedCompetencies = data.stats.competencies;
                            state.stats = {
                                ...state.stats,
                                ...data.stats,
                                competencies: {
                                    ...state.stats.competencies,
                                    ...(importedCompetencies && typeof importedCompetencies === 'object' && !Array.isArray(importedCompetencies)
                                        ? importedCompetencies
                                        : {})
                                }
                            };
                        }
                        if (data.currentSession && typeof data.currentSession === 'object' && !Array.isArray(data.currentSession)) {
                            state.currentSession = {
                                ...state.currentSession,
                                ...data.currentSession,
                                startTime: Date.now()
                            };
                        }
                        if (data.customRandomExamples && typeof data.customRandomExamples === 'object' && !Array.isArray(data.customRandomExamples)) {
                            state.melodicStudio.customRandomExamples = {
                                ...state.melodicStudio.customRandomExamples,
                                ...data.customRandomExamples
                            };
                            populateMelodicStudioExamplesDropdown();
                        }
                        const saved = savePersistedState();
                        populateWelcomeUserSelect();
                        updateDisplay();
                        if (el('historyModalContent')) el('historyModalContent').innerHTML = buildFullGamifiedSessionReportHTML(false);
                        if (!saved) return;
                        showFeedbackBanner('📥 Datos y melodías importados correctamente.', 'success');
                    } catch (error) {
                        console.error('Error al importar los datos del perfil:', error);
                        showFeedbackBanner('❌ Archivo JSON inválido o incompatible.', 'error');
                    }
                };
                reader.readAsText(file);
            });
        }

        if (el('toggleNoteRestStudioBtn')) {
            el('toggleNoteRestStudioBtn').addEventListener('click', () => {
                const ex = getMelodicExampleById(state.melodicStudio.exampleId);
                const notesList = getFlattenedNotesFromExample(state.melodicStudio.exampleId);
                const idx = state.melodicStudio.selectedNoteIdx !== null ? state.melodicStudio.selectedNoteIdx : 0;
                const cur = notesList[idx];
                if (!cur || !ex) return;
                const rawNote = ex.measures[cur.measureIdx]?.notes[cur.noteIdxInMeasure];
                if (!rawNote) return;
                rawNote.isRest = !rawNote.isRest;
                state.melodicStudio.autoFilledPhraseVoicings = {};
                renderMelodicStudioUI();
            });
        }
        if (el('openCustomMelodyEditorBtn')) {
            el('openCustomMelodyEditorBtn').addEventListener('click', () => {
                const curDraft = state.melodicStudio.customEditorDraft;
                initCustomMelodyDraft(state.melodicStudio.barsCount, curDraft?.timeSigNum || 4, curDraft?.timeSigDen || 4);
                renderCustomMelodyEditorUI();
                el('customMelodyModalOverlay')?.classList.add('visible');
            });
        }
        if (el('customTimeSigNumSelect') || el('customTimeSigDenSelect')) {
            [el('customTimeSigNumSelect'), el('customTimeSigDenSelect')].forEach(sel => sel?.addEventListener('change', () => {
                const num = parseInt(el('customTimeSigNumSelect')?.value || '4', 10) || 4;
                const den = parseInt(el('customTimeSigDenSelect')?.value || '4', 10) || 4;
                const bars = parseInt(el('customMelodyBarsSelect')?.value || '4', 10) || 4;
                initCustomMelodyDraft(bars, num, den);
                renderCustomMelodyEditorUI();
            }));
        }
        if (el('customAddRestBtn')) {
            el('customAddRestBtn').addEventListener('click', () => {
                const draft = state.melodicStudio.customEditorDraft;
                const curBar = draft.measures[draft.activeBarIdx];
                if (!curBar) return;
                const maxQ = getCustomEditorMaxQuarterBeats();
                const usedQ = curBar.notes.reduce((s, x) => s + getBeatsForDuration(x.dur), 0);
                const remQ = +(maxQ - usedQ).toFixed(4);
                if (remQ <= 0.01) return;
                let dur = el('customNoteDurSelect')?.value || 'q';
                const durCatalog = [
                    { dur: 'w', qBeats: 4 },
                    { dur: 'h', qBeats: 2 },
                    { dur: 'q', qBeats: 1 },
                    { dur: '8', qBeats: 0.5 },
                    { dur: '16', qBeats: 0.25 }
                ];
                if (getBeatsForDuration(dur) > remQ + 0.001) {
                    const fitted = durCatalog.find(d => d.qBeats <= remQ + 0.001);
                    if (!fitted) return;
                    dur = fitted.dur;
                }
                curBar.notes.push({ note: 'B/4', dur, isRest: true });
                draft.activeNoteIdx = curBar.notes.length - 1;
                renderCustomMelodyEditorUI();
            });
        }
        if (el('customCompleteBarBtn')) {
            el('customCompleteBarBtn').addEventListener('click', () => {
                const draft = state.melodicStudio.customEditorDraft;
                const curBar = draft.measures[draft.activeBarIdx];
                if (!curBar) return;
                fillRemainingBeatsInEditorBar(curBar, getCustomEditorMaxQuarterBeats(), curBar.notes.length === 0);
                draft.activeNoteIdx = curBar.notes.length - 1;
                renderCustomMelodyEditorUI();
            });
        }
        if (el('customPrevNoteInBarBtn')) el('customPrevNoteInBarBtn').addEventListener('click', () => navigateCustomEditorNotes(-1));
        if (el('customNextNoteInBarBtn')) el('customNextNoteInBarBtn').addEventListener('click', () => navigateCustomEditorNotes(1));
        if (el('customNoteOctDownBtn')) el('customNoteOctDownBtn').addEventListener('click', () => shiftCustomEditorNoteOctave(-1));
        if (el('customNoteOctUpBtn')) el('customNoteOctUpBtn').addEventListener('click', () => shiftCustomEditorNoteOctave(1));
        if (el('customMelodyBarsSelect')) {
            el('customMelodyBarsSelect').addEventListener('change', e => {
                const draft = state.melodicStudio.customEditorDraft;
                initCustomMelodyDraft(parseInt(e.target.value, 10) || 4, draft?.timeSigNum || 4, draft?.timeSigDen || 4);
                renderCustomMelodyEditorUI();
            });
        }
        if (el('customBarSplitSelect')) {
            el('customBarSplitSelect').addEventListener('change', e => {
                const draft = state.melodicStudio.customEditorDraft;
                const curBar = draft.measures[draft.activeBarIdx];
                if (curBar) {
                    curBar.splitCount = parseInt(e.target.value, 10) || 1;
                    renderCustomMelodyEditorUI();
                }
            });
        }
        ['customBarChord1Root', 'customBarChord1Type', 'customBarChord2Root', 'customBarChord2Type'].forEach(selId => {
            if (el(selId)) {
                el(selId).addEventListener('change', () => {
                    const draft = state.melodicStudio.customEditorDraft;
                    const curBar = draft.measures[draft.activeBarIdx];
                    if (!curBar) return;
                    curBar.chord1Root = el('customBarChord1Root')?.value || 'C';
                    curBar.chord1Type = el('customBarChord1Type')?.value || 'maj7';
                    curBar.chord2Root = el('customBarChord2Root')?.value || 'C';
                    curBar.chord2Type = el('customBarChord2Type')?.value || 'maj7';
                    renderCustomMelodyEditorUI();
                });
            }
        });
        if (el('customBarUndoNoteBtn')) {
            el('customBarUndoNoteBtn').addEventListener('click', () => {
                const draft = state.melodicStudio.customEditorDraft;
                const curBar = draft.measures[draft.activeBarIdx];
                if (curBar && curBar.notes.length) { curBar.notes.pop(); renderCustomMelodyEditorUI(); }
            });
        }
        if (el('customBarClearNotesBtn')) {
            el('customBarClearNotesBtn').addEventListener('click', () => {
                const draft = state.melodicStudio.customEditorDraft;
                const curBar = draft.measures[draft.activeBarIdx];
                if (curBar) { curBar.notes = []; renderCustomMelodyEditorUI(); }
            });
        }
        if (el('applyCustomMelodyAutoBtn')) el('applyCustomMelodyAutoBtn').addEventListener('click', () => loadCustomEditorDraftIntoStudio(false));
        if (el('applyCustomMelodyManualBtn')) el('applyCustomMelodyManualBtn').addEventListener('click', () => loadCustomEditorDraftIntoStudio(true));
        if (el('closeCustomMelodyModalBtn')) el('closeCustomMelodyModalBtn').addEventListener('click', () => el('customMelodyModalOverlay')?.classList.remove('visible'));
        // Punto 9: Tutorial interactivo completo actualizado con todas las funciones y atajos
        const TUTORIAL_STEPS = [
            {
                id: 'displaySection',
                title: '1. Bloque Armónico: Nivel Básico a 3 Voces y Niveles 4–5 Voces',
                text: 'El Nivel Básico está diseñado exclusivamente para tríadas a 3 voces: Mayor, Menor, Aumentado, Disminuido, Sus2 y Sus4 en posición cerrada (1ª, 2ª y 3ª voz de agudo a grave). Los niveles Intermedio y Avanzado expanden la práctica a 4 y 5 voces (4-Way Close con séptimas, tensiones y Variantes 1, 2 y 3). Toda nota inferior a Do central (< C4) pasa automáticamente a Clave de Fa en Gran Pentagrama. Usa teclas A–G (C D E F G A B) o números 1–7 para ingresar notas, + para sostenido (#), - para bemol (b), 0 para becuadro (♮), ++ para doble sostenido (##) y -- para doble bemol (bb).'
            },
            {
                id: 'advancedModesToolbar',
                title: '2. Disposiciones Armónicas (Drops, Spreads, Ambi Chords) y Alertas Acústicas',
                text: 'Abre tus voicings con Drop 2, Drop 3, Drop 2&4, Shearing / Double Lead (5ª voz a la octava baja), Spreads a 4 y 5 voces (Métodos 1, 2 y 3) o Ambi Chords (Modelos A, B y C por cuartas). El sistema audita acústicamente cada acorde en tiempo real, alertando de disonancias de 2ª menor en la voz superior o violaciones del límite de intervalos graves (LIL).'
            },
            {
                id: 'livePermutationsBar',
                title: '3. Permutaciones de Tensiones y Regla Especial de Acordes 7',
                text: 'Enriquece los acordes con tensiones sustitutas: 9na, b9 o #9 por fundamental o 3ra; #11, 11na, 13na o b13 por 5ta. Cuenta con la regla de permutación para acordes 7: cuando la 1ª voz tiene la fundamental del acorde, se permuta la b7 por b9 (ejemplo: G7 cerrado G-F-D-B se permuta a G-D-B-Ab). Haz clic en los chips interactivos de permutación para alternarlas al instante.'
            },
            {
                id: 'melodicAnalysisStudioPanel',
                title: '4. Análisis Melódico, Doble Análisis, Resoluciones Retardadas y Tonicizaciones',
                text: 'Clasifica cada nota como Principal (P / notas del acorde y tensiones) o Secundaria (S / d / aproximaciones). Incluye Doble Análisis cuando una nota del acorde actúa como aproximación, Resoluciones Retardadas (diatónica/cromática/dominante/disminuida), Voz Líder Independiente (#1 a #6) y catálogo integral de Tonicizaciones de 2 y 3 acordes hacia cualquier tonalidad de llegada.'
            },
            {
                id: 'studioLiveElementEditorBar',
                title: '5. Editor Melódico en Vivo, Puntillos en Todas las Voces, Tresillos con Símbolo 3 y Silencios',
                text: 'Modifica cualquier nota o figura en tiempo real con subdivisiones proporcionales automáticas. Dispones de figuras simples (w, h, q, 8, 16), figuras con puntillo (hd, qd, 8d) que se aplican a todas las notas y voces del bloque armónico, y Figuras de Tresillos grabadas con su corchete y símbolo 3 claramente visible: Tresillo de Negra (qt [6]), Tresillo de Corchea (8t [7]) y Tresillo de Semicorchea (16t [8]). Si faltan tiempos para completar el compás, pulsa "𝄽 + Silencios" o haz clic en la insignia de balance para autocompletar el compás con silencios. Mueve la altura de la nota seleccionada con agilidad: Ctrl + ↑ / ↓ para subir o bajar diatónicamente (escala del acorde), Ctrl + Alt + ↑ / ↓ para subir o bajar cromáticamente (semitono), y Shift + ↑ / ↓ para subir o bajar octavas.'
            },
            {
                id: 'studioPlaybackToolbar',
                title: '6. Audio Avanzado: Playback, Bucle de Compás (Loop), Swing Jazz y Claqueta',
                text: 'Reproduce con síntesis polifónica Tone.js mediante la Barra Espaciadora. Activa el modo Bucle (🔁 Loop) para repetir indefinidamente el compás activo mientras practicas, alterna entre articulación Directa y Swing Jazz (lilt 2:1 apaisado), activa la Claqueta de metrónomo en los tiempos débiles 2 y 4, y visualiza las curvas de enlace vocal (Voice Leading) entre notas contiguas.'
            },
            {
                id: 'continuityPanel',
                title: '7. Continuidad Armónica (8 Compases) y Exportación Universal (MIDI, MusicXML, PDF, JSON)',
                text: 'Aplica enlaces armónicos a 8 compases manteniendo notas comunes en la misma voz (verde) o conduciendo la 1ª voz por cercanía (violeta). Exporta tus arreglos en archivo estándar MIDI Type 0 (.mid) con ticks exactos de tresillos, en formato profesional MusicXML (.musicxml) para programas de partituras, en PDF vectorial o respalda todo tu perfil y melodías en JSON.'
            }
        ];
        const showTut = () => {
            document.querySelectorAll('.tutorial-highlight').forEach(x => x.classList.remove('tutorial-highlight'));
            const step = TUTORIAL_STEPS[state.tutorial.currentStep] || TUTORIAL_STEPS[0];
            if (el('tutorialStepBadge')) el('tutorialStepBadge').textContent = `Paso ${state.tutorial.currentStep + 1} de ${TUTORIAL_STEPS.length}`;
            if (el('tutorialTitle')) el('tutorialTitle').textContent = step.title;
            if (el('tutorialText')) el('tutorialText').textContent = step.text;
            const targetEl = el(step.id);
            if (targetEl && !targetEl.classList.contains('hidden')) {
                targetEl.classList.add('tutorial-highlight');
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            el('tutorialOverlay')?.classList.remove('hidden');
        };
        if (el('showTutorialButton')) {
            el('showTutorialButton').addEventListener('click', () => {
                state.tutorial.currentStep = 0;
                showTut();
            });
        }
        if (el('tutorialPrevButton')) {
            el('tutorialPrevButton').addEventListener('click', () => {
                state.tutorial.currentStep = (state.tutorial.currentStep - 1 + TUTORIAL_STEPS.length) % TUTORIAL_STEPS.length;
                showTut();
            });
        }
        if (el('tutorialNextButton')) {
            el('tutorialNextButton').addEventListener('click', () => {
                if (state.tutorial.currentStep >= TUTORIAL_STEPS.length - 1) {
                    state.stats.tutorialSeen = true;
                    savePersistedState();
                    document.querySelectorAll('.tutorial-highlight').forEach(element => element.classList.remove('tutorial-highlight'));
                    el('tutorialOverlay')?.classList.add('hidden');
                    return;
                }
                state.tutorial.currentStep++;
                showTut();
            });
        }
        if (el('tutorialEndButton')) {
            el('tutorialEndButton').addEventListener('click', () => {
                document.querySelectorAll('.tutorial-highlight').forEach(x => x.classList.remove('tutorial-highlight'));
                el('tutorialOverlay')?.classList.add('hidden');
            });
        }
        if (el('tutorialOpenShortcutsBtn')) {
            el('tutorialOpenShortcutsBtn').addEventListener('click', () => {
                el('tutorialOverlay')?.classList.add('hidden');
                el('shortcutsModalOverlay')?.classList.add('visible');
            });
        }
        if (el('darkModeButton')) {
            el('darkModeButton').addEventListener('click', () => {
                state.darkMode = !state.darkMode;
                document.body.classList.toggle('dark-mode', state.darkMode);
                el('darkModeButton').textContent = state.darkMode ? '☀️' : '🌙';
            });
        }

        el('voiceNavUpBtn')?.addEventListener('click', () => navigateChordGridVoice(-1));
        el('voiceNavDownBtn')?.addEventListener('click', () => navigateChordGridVoice(1));
        el('changePositionBtn')?.addEventListener('click', cycleContinuityBarPosition);
        el('toggleInitialNoteBtn')?.addEventListener('click', toggleContinuityGiveInitialNote);

        const applyScoreZoom = zoom => {
            state.melodicStudio.scoreZoomPercent = Math.max(60, Math.min(180, zoom));
            if (el('scoreZoomResetBtn')) el('scoreZoomResetBtn').textContent = `${state.melodicStudio.scoreZoomPercent}%`;
            drawMelodicPhraseScore(-1);
            if (state.melodicStudio.selectedNoteIdx !== null) {
                scrollMelodicScoreToNote(state.melodicStudio.selectedNoteIdx);
            }
        };
        el('scoreZoomOutBtn')?.addEventListener('click', () => applyScoreZoom(state.melodicStudio.scoreZoomPercent - 15));
        el('scoreZoomResetBtn')?.addEventListener('click', () => applyScoreZoom(100));
        el('scoreZoomInBtn')?.addEventListener('click', () => applyScoreZoom(state.melodicStudio.scoreZoomPercent + 15));

        let scoreResizeFrame = null;
        window.addEventListener('resize', () => {
            if (!state.melodicStudio.isActive || scoreResizeFrame !== null) return;
            scoreResizeFrame = requestAnimationFrame(() => {
                scoreResizeFrame = null;
                drawMelodicPhraseScore(-1);
                if (state.melodicStudio.selectedNoteIdx !== null) {
                    scrollMelodicScoreToNote(state.melodicStudio.selectedNoteIdx);
                }
            });
        });

        const renderLeadSheetCatalog = () => {
            const container = el('leadSheetCardsContainer');
            if (!container) return;
            const query = (el('leadSheetSearchInput')?.value || '').toLowerCase().trim();
            const category = el('leadSheetCategoryFilter')?.value || 'all';
            const filtered = JAZZ_STANDARDS_LIBRARY.filter(item => {
                const matchesCategory = category === 'all' || item.category === category;
                const matchesQuery = !query
                    || item.title.toLowerCase().includes(query)
                    || item.category.toLowerCase().includes(query)
                    || item.prog.some(chord => `${chord[0]}${chord[1]}`.toLowerCase().includes(query));
                return matchesCategory && matchesQuery;
            });
            container.innerHTML = filtered.map(item => {
                const chordPreview = item.prog.map(chord => chord[2] === 2
                    ? `${displayNote(chord[0])}${chord[1]} - ${displayNote(chord[3])}${chord[4]}`
                    : `${displayNote(chord[0])}${chord[1]}`).join(' | ');
                return `<div class="p-3 rounded-xl border border-slate-300 bg-white flex flex-col justify-between gap-2">
                    <div>
                        <div class="flex items-center justify-between gap-1">
                            <span class="font-extrabold text-sm text-indigo-700">${item.title}</span>
                            <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">${item.category} • ${item.bpm} BPM</span>
                        </div>
                        <div class="font-mono text-[11px] opacity-85 mt-1">${chordPreview}</div>
                    </div>
                    <div class="flex gap-1.5">
                        <button type="button" data-load-std="${item.id}" data-std-mode="auto" class="toolbar-btn flex-1 bg-emerald-600 text-white">🎼 Cargar Armonizado</button>
                        <button type="button" data-load-std="${item.id}" data-std-mode="manual" class="toolbar-btn flex-1 bg-teal-700 text-white">🧩 Cargar para Armar</button>
                    </div>
                </div>`;
            }).join('');
            container.querySelectorAll('[data-load-std]').forEach(button => {
                button.addEventListener('click', event => {
                    const target = event.currentTarget;
                    const standardId = target.dataset.loadStd;
                    const standard = JAZZ_STANDARDS_LIBRARY.find(item => item.id === standardId);
                    if (!standard || !MELODIC_ANALYSIS_EXAMPLES[standardId]) {
                        showFeedbackBanner('❌ No se encontró el estándar seleccionado.', 'error');
                        return;
                    }
                    state.melodicStudio.isActive = true;
                    state.continuityMode = false;
                    state.melodicStudio.exampleId = standardId;
                    state.melodicStudio.enharmonicNoteSpellingByNote = {};
                    state.melodicStudio.barsCount = 8;
                    setStudioTempo(standard.bpm);
                    state.melodicStudio.stepByStepMode = target.dataset.stdMode === 'manual';
                    state.melodicStudio.manuallyClearedNotes = {};
                    state.melodicStudio.selectedClassificationByNote = {};
                    state.melodicStudio.selectedHarmonizationByNote = {};
                    state.melodicStudio.voicingDispositionByNote = {};
                    state.melodicStudio.autoFilledPhraseVoicings = {};
                    state.melodicStudio.selectedNoteIdx = null;
                    populateMelodicStudioExamplesDropdown();
                    el('leadSheetLibraryModalOverlay')?.classList.remove('visible');
                    el('mechanicalApproachBtn')?.classList.add('bg-emerald-600', 'text-white');
                    renderContinuityPanel();
                    renderMelodicStudioUI();
                });
            });
        };
        el('openLeadSheetLibraryBtn')?.addEventListener('click', () => {
            renderLeadSheetCatalog();
            el('leadSheetLibraryModalOverlay')?.classList.add('visible');
        });
        el('closeLeadSheetLibraryBtn')?.addEventListener('click', () => el('leadSheetLibraryModalOverlay')?.classList.remove('visible'));
        el('leadSheetSearchInput')?.addEventListener('input', renderLeadSheetCatalog);
        el('leadSheetCategoryFilter')?.addEventListener('change', renderLeadSheetCatalog);

        // Punto 9: Atajos de teclado completos incluyendo navegación en Crear Melodía y cambio de octavas
        document.addEventListener('keydown', e => {
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(#welcomeModalOverlay)').forEach(m => m.classList.remove('visible'));
                el('tutorialOverlay')?.classList.add('hidden');
                return;
            }
            const isCustomEditorOpen = el('customMelodyModalOverlay')?.classList.contains('visible');
            if (isCustomEditorOpen) {
                if (e.key === 'ArrowLeft') { e.preventDefault(); navigateCustomEditorNotes(-1); return; }
                if (e.key === 'ArrowRight') { e.preventDefault(); navigateCustomEditorNotes(1); return; }
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const delta = e.key === 'ArrowUp' ? 1 : -1;
                    if (e.shiftKey) {
                        shiftCustomEditorNote('octave', delta);
                    } else if ((e.ctrlKey || e.metaKey) && e.altKey) {
                        shiftCustomEditorNote('chromatic', delta);
                    } else if (e.ctrlKey || e.metaKey) {
                        shiftCustomEditorNote('diatonic', delta);
                    } else {
                        shiftCustomEditorNote('diatonic', delta);
                    }
                    return;
                }
                if (e.key.toLowerCase() === 'r') { e.preventDefault(); el('customAddRestBtn')?.click(); return; }
                if (e.key === 'Backspace') { e.preventDefault(); el('customBarUndoNoteBtn')?.click(); return; }
                if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
                    e.preventDefault();
                    const durMap = { '1': 'w', '2': 'h', '3': 'q', '4': '8', '5': '16', '6': 'qt', '7': '8t', '8': '16t' };
                    if (el('customNoteDurSelect')) el('customNoteDurSelect').value = durMap[e.key];
                    return;
                }
                if (/^[a-gA-G]$/.test(e.key)) {
                    e.preventDefault();
                    const letter = e.key.toUpperCase();
                    const btn = el('customNotePitchButtons')?.querySelector(`[data-edp="${letter}"]`);
                    btn?.click();
                    return;
                }
                return;
            }
            const isStudioAllowedSelectKey = state.melodicStudio.isActive
                && tag === 'SELECT'
                && (['ArrowLeft', 'ArrowRight'].includes(e.key) || ((e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) && ['ArrowUp', 'ArrowDown'].includes(e.key)));
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (tag === 'SELECT' && !isStudioAllowedSelectKey)) return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                if (e.shiftKey) redoStudioAction();
                else undoStudioAction();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                redoStudioAction();
                return;
            }
            if (state.melodicStudio.isActive && state.melodicStudio.selectedNoteIdx !== null && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
                e.preventDefault();
                const durMap = {
                    '1': 'w',
                    '2': 'h',
                    '3': 'q',
                    '4': '8',
                    '5': '16',
                    '6': 'qt',
                    '7': '8t',
                    '8': '16t'
                };
                if (el('liveEditDurSelect')) {
                    el('liveEditDurSelect').value = durMap[e.key];
                    applyLiveNoteModification(true);
                }
                return;
            }
            if (state.melodicStudio.isActive && state.melodicStudio.selectedNoteIdx !== null && e.key === '.') {
                e.preventDefault();
                const sel = el('liveEditDurSelect');
                if (sel) {
                    const cur = sel.value;
                    const dotMap = {
                        'w': 'hd', 'hd': 'w',
                        'h': 'qd', 'qd': 'h',
                        'q': '8d', '8d': 'q',
                        '8': '8d', '8d': '8'
                    };
                    if (dotMap[cur]) {
                        sel.value = dotMap[cur];
                        applyLiveNoteModification(true);
                    }
                }
                return;
            }
            if (state.melodicStudio.isActive && state.melodicStudio.selectedNoteIdx !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                liveDeleteNote();
                return;
            }
            if (state.melodicStudio.isActive && (e.key === 'Insert' || (e.key === '+' && e.shiftKey) || e.key === '=')) {
                e.preventDefault();
                liveAddNote();
                return;
            }
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                el('openLeadSheetLibraryBtn')?.click();
                return;
            }
            if (e.key.toLowerCase() === 'm') {
                e.preventDefault();
                el('mechanicalApproachBtn')?.click();
                return;
            }
            if (e.key.toLowerCase() === 'j') {
                e.preventDefault();
                el('continuityModeBtn')?.click();
                return;
            }
            if (e.key.toLowerCase() === 'y') {
                e.preventDefault();
                el('dictationModeBtn')?.click();
                return;
            }
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                el('hintButton')?.click();
                return;
            }
            if (/^[a-gA-G]$/.test(e.key)) { e.preventDefault(); addUserVoiceNote(e.key.toUpperCase()); return; }
            if (/^[1-7]$/.test(e.key)) {
                e.preventDefault();
                const mapNum = { '1': 'C', '2': 'D', '3': 'E', '4': 'F', '5': 'G', '6': 'A', '7': 'B' };
                addUserVoiceNote(mapNum[e.key]);
                return;
            }
            if (e.key === '+') { e.preventDefault(); applyAccidentalToActiveVoice('#'); return; }
            if (e.key === '-') { e.preventDefault(); applyAccidentalToActiveVoice('b'); return; }
            if (e.key === '0' || e.key === '=') { e.preventDefault(); applyAccidentalToActiveVoice('♮'); return; }
            if (e.key.toLowerCase() === 'r' && state.melodicStudio.isActive) { e.preventDefault(); el('toggleNoteRestStudioBtn')?.click(); return; }
            if (e.key.toLowerCase() === 'g' && state.melodicStudio.isActive) { e.preventDefault(); el('generateRandomMelodyBtn')?.click(); return; }
            if (e.key.toLowerCase() === 'f' && state.melodicStudio.isActive) { e.preventDefault(); el('openCustomMelodyEditorBtn')?.click(); return; }
            if (e.key === 'ArrowUp' && (!state.melodicStudio.isActive || state.melodicStudio.selectedNoteIdx === null)) {
                e.preventDefault();
                navigateChordGridVoice(-1);
                return;
            }
            if (e.key === 'ArrowDown' && (!state.melodicStudio.isActive || state.melodicStudio.selectedNoteIdx === null)) {
                e.preventDefault();
                navigateChordGridVoice(1);
                return;
            }
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && state.melodicStudio.isActive && state.melodicStudio.selectedNoteIdx !== null) {
                e.preventDefault();
                const delta = e.key === 'ArrowUp' ? 1 : -1;
                if (e.shiftKey) {
                    shiftStudioSelectedNote('octave', delta);
                } else if ((e.ctrlKey || e.metaKey) && e.altKey) {
                    shiftStudioSelectedNote('chromatic', delta);
                } else if (e.ctrlKey || e.metaKey) {
                    shiftStudioSelectedNote('diatonic', delta);
                } else {
                    shiftStudioSelectedNote('diatonic', delta);
                }
                return;
            }
            if (e.key === 'ArrowLeft') {
                if (state.melodicStudio.isActive) { e.preventDefault(); navigateMelodicStudioNote(-1); return; }
                if (state.continuityMode && state.continuity.measures.length) {
                    e.preventDefault();
                    loadContinuityBar((state.continuity.currentBar - 1 + 8) % 8);
                    return;
                }
            }
            if (e.key === 'ArrowRight') {
                if (state.melodicStudio.isActive) { e.preventDefault(); navigateMelodicStudioNote(1); return; }
                if (state.continuityMode && state.continuity.measures.length) {
                    e.preventDefault();
                    loadContinuityBar((state.continuity.currentBar + 1) % 8);
                    return;
                }
            }
            if (e.key === ' ') {
                e.preventDefault();
                if (state.melodicStudio.isActive) {
                    playStudioPhrase(getFirstNoteIndexOfSelectedBar(), false);
                } else {
                    playNotesList(state.selectedUserNotes.length > 1 ? state.selectedUserNotes : state.correctNotesWithOctave);
                }
                return;
            }
            if (e.key.toLowerCase() === 'z') { e.preventDefault(); el('scoreZoomOutBtn')?.click(); return; }
            if (e.key.toLowerCase() === 'x') { e.preventDefault(); el('scoreZoomInBtn')?.click(); return; }
            if (e.key.toLowerCase() === 'i' && state.continuityMode) { e.preventDefault(); cycleContinuityBarPosition(); return; }
            if (e.key.toLowerCase() === 't' && state.continuityMode) { e.preventDefault(); toggleContinuityGiveInitialNote(); return; }
            if (e.key === 'Backspace') { e.preventDefault(); el('undoLastNoteButton')?.click(); return; }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (state.exerciseSolved && !state.continuityMode) el('changeQuestionButton')?.click();
                else el('confirmAnswerButton')?.click();
            }
        });

        // Reloj en vivo (por ejercicio y cuenta regresiva de sesión)
        setInterval(() => {
            const elapsed = (Date.now() - state.timer.exerciseStartTime) / 1000;
            if (el('liveTimerText')) el('liveTimerText').textContent = elapsed.toFixed(1) + 's';
            const sessBadge = el('sessionRemainingBadge');
            if (state.timer.sessionEndTime && sessBadge) {
                const remSec = Math.max(0, Math.ceil((state.timer.sessionEndTime - Date.now()) / 1000));
                const mm = Math.floor(remSec / 60);
                const ss = String(remSec % 60).padStart(2, '0');
                sessBadge.classList.remove('hidden');
                sessBadge.textContent = `Sesión: ${mm}:${ss}`;
                if (remSec <= 0) {
                    state.timer.sessionEndTime = null;
                    el('endSessionTopBtn')?.click();
                }
            } else if (sessBadge) {
                sessBadge.classList.add('hidden');
            }
        }, 250);
    }

    function unlockBadge(id) {
        if (!state.stats.unlockedBadges.includes(id)) {
            state.stats.unlockedBadges.push(id);
            const b = BADGES_CATALOG.find(x => x.id === id);
            if (b && el('badgeToast')) {
                el('badgeToastIcon').textContent = b.icon;
                el('badgeToastTitle').textContent = b.title;
                el('badgeToast').classList.add('show');
                setTimeout(() => el('badgeToast').classList.remove('show'), 3200);
            }
        }
    }

    function boot() {
        generateNoteButtons();
        generatePiano();
        setupListeners();
        populateMelodicStudioExamplesDropdown();
        generateStandAloneExercise();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
