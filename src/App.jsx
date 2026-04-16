import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { 
  Home, 
  Activity, 
  Pill, 
  Settings as SettingsIcon, 
  Plus, 
  Camera, 
  Check, 
  Trash2, 
  Trophy, 
  Apple,
  X,
  Search,
  ChevronRight,
  Flame
} from 'lucide-react';

// --- OFFLINE-FIRST DATABASE (MOCKING WATERMELONDB/MMKV) ---
const DB_KEY = '@gamified_tracker_db';

const defaultState = {
  active_modules: { nutrition: true, fitness: true, medication: true },
  users: { id: 'u1', total_xp: 0, current_level: 1 },
  achievements: [],
  local_foods: {}, // { barcode: { ...foodData } }
  food_logs: [],
  workout_sessions: [],
  medication_definitions: [],
  medication_logs: []
};

function loadDB() {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : defaultState;
}

function saveDB(state) {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
}

// --- CONTEXTS ---
const AppContext = createContext();

// --- UTILS ---
const triggerHaptic = (type = 'light') => {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(10);
    if (type === 'success') navigator.vibrate([20, 50, 20]);
    if (type === 'heavy') navigator.vibrate(40);
  }
};

const getTodayString = () => new Date().toISOString().split('T')[0];

// --- MAIN APP PROVIDER ---
const AppProvider = ({ children }) => {
  const [db, setDb] = useState(loadDB());
  const [toast, setToast] = useState(null);
  const [levelUpModal, setLevelUpModal] = useState(null);

  // Sync db to localStorage whenever it changes
  useEffect(() => {
    saveDB(db);
  }, [db]);

  const updateDb = (updater) => {
    setDb(prev => {
      const next = updater({ ...prev });
      return next;
    });
  };

  const showToast = (msg, icon = null) => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const addXP = (amount, reason) => {
    triggerHaptic('success');
    showToast(`+${amount} XP: ${reason}`, <Trophy size={16} className="text-yellow-400" />);
    
    updateDb(state => {
      let newXp = state.users.total_xp + amount;
      let newLevel = state.users.current_level;
      let xpRequired = newLevel * 200; // Escalating curve

      if (newXp >= xpRequired) {
        newLevel += 1;
        newXp -= xpRequired;
        setTimeout(() => setLevelUpModal(newLevel), 500);
      }

      state.users.total_xp = newXp;
      state.users.current_level = newLevel;
      return state;
    });
  };

  return (
    <AppContext.Provider value={{ db, updateDb, addXP, showToast }}>
      {children}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 z-50 animate-bounce">
          {toast.icon}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}
      {/* Level Up Modal */}
      {levelUpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-105 transition-transform">
            <div className="bg-yellow-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy size={48} className="text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Level Up!</h2>
            <p className="text-gray-500 mb-6">You reached Level {levelUpModal}</p>
            <button 
              onClick={() => setLevelUpModal(null)}
              className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
            >
              Awesome
            </button>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

// --- UI COMPONENTS (iOS HIG MOCKS) ---
const ScreenHeader = ({ title, rightAction }) => (
  <div className="flex justify-between items-center px-4 pt-12 pb-4 bg-[#F2F2F7] sticky top-0 z-20 border-b border-gray-200/50 backdrop-blur-md bg-opacity-80">
    <h1 className="text-3xl font-bold text-black tracking-tight">{title}</h1>
    {rightAction}
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

const IOSSwitch = ({ checked, onChange }) => (
  <div 
    onClick={() => { triggerHaptic(); onChange(!checked); }}
    className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
  >
    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-6' : ''}`} />
  </div>
);

// --- SCREENS ---

// 1. HOME SCREEN
const HomeScreen = () => {
  const { db } = useContext(AppContext);
  const { nutrition, fitness, medication } = db.active_modules;
  const today = getTodayString();

  // Aggregates
  const todayFoods = db.food_logs.filter(log => log.date === today);
  const totalCalories = todayFoods.reduce((sum, log) => {
    const food = db.local_foods[log.food_id];
    return sum + (food ? (food.calories * log.serving_size) : 0);
  }, 0);

  const todayWorkouts = db.workout_sessions.filter(s => s.date === today);
  const totalVolume = todayWorkouts.reduce((sum, session) => {
    return sum + session.exercises.reduce((exSum, ex) => {
      return exSum + ex.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0);
    }, 0);
  }, 0);

  const todayMeds = db.medication_logs.filter(log => log.date === today && log.status === 'taken');

  return (
    <div className="pb-24">
      <ScreenHeader title="Dashboard" />
      
      {/* XP Banner */}
      <div className="m-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-blue-100">Level {db.users.current_level}</span>
            <Trophy size={20} className="text-yellow-300" />
          </div>
          <div className="text-2xl font-bold mb-3">{db.users.total_xp} XP</div>
          <div className="w-full bg-black/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500" 
              style={{ width: `${(db.users.total_xp % 200) / 200 * 100}%` }}
            />
          </div>
          <div className="text-xs text-blue-100 mt-2 text-right">{200 - (db.users.total_xp % 200)} XP to next level</div>
        </Card>
      </div>

      <div className="px-4 space-y-4">
        {nutrition && (
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-full text-orange-500"><Flame size={24} /></div>
              <div>
                <h3 className="text-gray-500 text-sm font-semibold">Calories Today</h3>
                <p className="text-2xl font-bold">{Math.round(totalCalories)} kcal</p>
              </div>
            </div>
          </Card>
        )}

        {fitness && (
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full text-blue-500"><Activity size={24} /></div>
              <div>
                <h3 className="text-gray-500 text-sm font-semibold">Volume Lifted</h3>
                <p className="text-2xl font-bold">{totalVolume} kg</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-400">{todayWorkouts.length} sessions</span>
            </div>
          </Card>
        )}

        {medication && (
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full text-green-500"><Pill size={24} /></div>
              <div>
                <h3 className="text-gray-500 text-sm font-semibold">Meds Taken</h3>
                <p className="text-2xl font-bold">{todayMeds.length}</p>
              </div>
            </div>
          </Card>
        )}

        {!nutrition && !fitness && !medication && (
          <div className="text-center text-gray-500 mt-10">
            <SettingsIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p>All modules are disabled.</p>
            <p className="text-sm">Go to Settings to enable them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. NUTRITION MODULE
const NutritionScreen = () => {
  const { db, updateDb, addXP, showToast } = useContext(AppContext);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [servingSize, setServingSize] = useState(1);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualData, setManualData] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  const today = getTodayString();
  const todayLogs = db.food_logs.filter(l => l.date === today);

  const simulateScan = () => {
    triggerHaptic('heavy');
    setIsScanning(true);
    // Simulate VisionCamera barcode detection delay
    setTimeout(async () => {
      const demoBarcode = "3017620422003"; // Nutella as demo
      // Check local cache first (WatermelonDB simulation)
      if (db.local_foods[demoBarcode]) {
        triggerHaptic('success');
        setScanResult(db.local_foods[demoBarcode]);
        setIsScanning(false);
      } else {
        // Fallback API query
        try {
          const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${demoBarcode}.json`);
          const data = await res.json();
          if (data.status === 1) {
            triggerHaptic('success');
            const food = {
              barcode: demoBarcode,
              name: data.product.product_name || "Unknown Food",
              calories: data.product.nutriments['energy-kcal_100g'] || 0,
              protein: data.product.nutriments.proteins_100g || 0,
              carbs: data.product.nutriments.carbohydrates_100g || 0,
              fat: data.product.nutriments.fat_100g || 0,
            };
            // Persist to local cache immediately
            updateDb(state => { state.local_foods[demoBarcode] = food; return state; });
            addXP(50, "Added new food to global database!");
            setScanResult(food);
          } else {
            showToast("Barcode not found online. Please enter manually.");
            setManualEntry(true);
          }
        } catch (e) {
          showToast("Network error. Entering offline manual mode.");
          setManualEntry(true);
        }
        setIsScanning(false);
      }
    }, 1500);
  };

  const logFood = (food) => {
    updateDb(state => {
      state.food_logs.push({
        id: Date.now().toString(),
        food_id: food.barcode,
        date: today,
        serving_size: servingSize
      });
      return state;
    });
    setScanResult(null);
    setServingSize(1);
    addXP(10, "Logged a meal");
  };

  const saveManualFood = () => {
    const id = "manual_" + Date.now();
    const newFood = {
      barcode: id,
      name: manualData.name,
      calories: Number(manualData.calories),
      protein: Number(manualData.protein),
      carbs: Number(manualData.carbs),
      fat: Number(manualData.fat)
    };
    updateDb(state => { state.local_foods[id] = newFood; return state; });
    logFood(newFood);
    setManualEntry(false);
    addXP(50, "Manual food entry created");
  };

  return (
    <div className="pb-24 min-h-screen bg-[#F2F2F7]">
      <ScreenHeader 
        title="Nutrition" 
        rightAction={
          <button onClick={simulateScan} className="bg-blue-500 text-white p-2 rounded-full shadow-md active:scale-95">
            <Camera size={24} />
          </button>
        }
      />

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-green-500 rounded-3xl relative animate-pulse">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)]"></div>
          </div>
          <p className="text-white mt-8 font-semibold">Simulating native iOS VisionCamera...</p>
        </div>
      )}

      {/* Bottom Sheet for Scan Result */}
      {scanResult && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl animate-slide-up pb-10">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{scanResult.name}</h2>
              <button onClick={() => setScanResult(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="flex justify-between mb-6 bg-gray-50 p-4 rounded-xl">
              <div className="text-center"><div className="text-xs text-gray-500">Kcal</div><div className="font-bold">{scanResult.calories}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">Prot (g)</div><div className="font-bold">{scanResult.protein}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">Carbs (g)</div><div className="font-bold">{scanResult.carbs}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500">Fat (g)</div><div className="font-bold">{scanResult.fat}</div></div>
            </div>

            {/* Cupertino Stepper Mock */}
            <div className="flex items-center justify-between bg-gray-100 p-2 rounded-xl mb-6">
              <span className="ml-2 font-semibold">Servings</span>
              <div className="flex items-center space-x-4">
                <button onClick={() => setServingSize(Math.max(0.5, servingSize - 0.5))} className="w-10 h-10 bg-white rounded-lg shadow flex items-center justify-center text-blue-500 text-xl font-bold">-</button>
                <span className="font-bold w-8 text-center">{servingSize}</span>
                <button onClick={() => setServingSize(servingSize + 0.5)} className="w-10 h-10 bg-white rounded-lg shadow flex items-center justify-center text-blue-500 text-xl font-bold">+</button>
              </div>
            </div>

            <button onClick={() => logFood(scanResult)} className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform">
              Log {Math.round(scanResult.calories * servingSize)} kcal
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Fallback */}
      {manualEntry && (
        <div className="fixed inset-0 z-40 bg-white p-4 pt-12 overflow-y-auto">
          <ScreenHeader title="Manual Entry" rightAction={<button onClick={() => setManualEntry(false)}><X/></button>} />
          <div className="space-y-4 mt-4">
            <input placeholder="Food Name" className="w-full p-4 bg-gray-100 rounded-xl" onChange={e => setManualData({...manualData, name: e.target.value})} />
            <input type="number" placeholder="Calories per serving" className="w-full p-4 bg-gray-100 rounded-xl" onChange={e => setManualData({...manualData, calories: e.target.value})} />
            <div className="flex space-x-2">
              <input type="number" placeholder="Protein (g)" className="w-1/3 p-4 bg-gray-100 rounded-xl" onChange={e => setManualData({...manualData, protein: e.target.value})} />
              <input type="number" placeholder="Carbs (g)" className="w-1/3 p-4 bg-gray-100 rounded-xl" onChange={e => setManualData({...manualData, carbs: e.target.value})} />
              <input type="number" placeholder="Fat (g)" className="w-1/3 p-4 bg-gray-100 rounded-xl" onChange={e => setManualData({...manualData, fat: e.target.value})} />
            </div>
            <button onClick={saveManualFood} className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl mt-8">Save & Log</button>
          </div>
        </div>
      )}

      {/* Today's Log */}
      <div className="px-4 mt-4">
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2 ml-2">Today's Log</h3>
        {todayLogs.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No food logged today.</p>
        ) : (
          <Card className="overflow-hidden">
            {todayLogs.map((log, index) => {
              const food = db.local_foods[log.food_id];
              if (!food) return null;
              return (
                <div key={log.id} className={`p-4 flex justify-between items-center bg-white ${index !== todayLogs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div>
                    <h4 className="font-semibold text-gray-900">{food.name}</h4>
                    <p className="text-sm text-gray-500">{log.serving_size} serving(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{Math.round(food.calories * log.serving_size)}</p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
};

// 3. FITNESS MODULE
const FitnessScreen = () => {
  const { db, updateDb, addXP } = useContext(AppContext);
  const [activeSession, setActiveSession] = useState(null);
  const [newExerciseName, setNewExerciseName] = useState('');

  const startWorkout = () => {
    triggerHaptic();
    const session = {
      id: "sesh_" + Date.now(),
      date: getTodayString(),
      name: "Workout " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      exercises: []
    };
    setActiveSession(session);
  };

  const addExercise = () => {
    if (!newExerciseName.trim()) return;
    setActiveSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, { id: "ex_" + Date.now(), name: newExerciseName, sets: [] }]
    }));
    setNewExerciseName('');
    triggerHaptic('light');
  };

  const addSet = (exerciseId) => {
    setActiveSession(prev => {
      const next = { ...prev };
      const ex = next.exercises.find(e => e.id === exerciseId);
      const lastSet = ex.sets[ex.sets.length - 1] || { weight: 0, reps: 0 };
      ex.sets.push({ id: "set_" + Date.now(), weight: lastSet.weight, reps: lastSet.reps, is_completed: false });
      return next;
    });
    triggerHaptic('light');
  };

  const updateSet = (exerciseId, setId, field, value) => {
    setActiveSession(prev => {
      const next = { ...prev };
      const ex = next.exercises.find(e => e.id === exerciseId);
      const set = ex.sets.find(s => s.id === setId);
      set[field] = Number(value);
      return next;
    });
  };

  const toggleSetComplete = (exerciseId, setId) => {
    triggerHaptic('success');
    setActiveSession(prev => {
      const next = { ...prev };
      const ex = next.exercises.find(e => e.id === exerciseId);
      const set = ex.sets.find(s => s.id === setId);
      set.is_completed = !set.is_completed;
      return next;
    });
  };

  const finishWorkout = () => {
    // Only save if there are completed sets to avoid junk data
    const hasData = activeSession.exercises.some(ex => ex.sets.some(s => s.is_completed));
    if (hasData) {
      updateDb(state => {
        state.workout_sessions.push(activeSession);
        return state;
      });
      addXP(100, "Completed a workout routine!");
    }
    setActiveSession(null);
  };

  if (activeSession) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] pb-24">
        <ScreenHeader 
          title="Active Session" 
          rightAction={
            <button onClick={finishWorkout} className="text-blue-500 font-bold bg-blue-100 px-4 py-1 rounded-full">
              Finish
            </button>
          }
        />
        
        <div className="p-4 space-y-6">
          {activeSession.exercises.map((ex) => (
            <Card key={ex.id} className="overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-800">
                {ex.name}
              </div>
              <div className="p-2 space-y-2">
                {ex.sets.map((set, idx) => (
                  <div key={set.id} className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${set.is_completed ? 'bg-green-50' : 'bg-white'}`}>
                    <div className="w-8 text-center text-sm font-semibold text-gray-400">{idx + 1}</div>
                    <div className="flex-1 flex space-x-2">
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          value={set.weight || ''} 
                          onChange={(e) => updateSet(ex.id, set.id, 'weight', e.target.value)}
                          className="w-full bg-gray-100 rounded-md p-2 text-center font-semibold"
                          placeholder="kg"
                        />
                      </div>
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          value={set.reps || ''} 
                          onChange={(e) => updateSet(ex.id, set.id, 'reps', e.target.value)}
                          className="w-full bg-gray-100 rounded-md p-2 text-center font-semibold"
                          placeholder="reps"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleSetComplete(ex.id, set.id)}
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${set.is_completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      <Check size={20} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addSet(ex.id)} className="w-full py-3 text-blue-500 font-semibold text-sm flex items-center justify-center">
                  <Plus size={16} className="mr-1" /> Add Set
                </button>
              </div>
            </Card>
          ))}

          <div className="flex space-x-2">
            <input 
              value={newExerciseName}
              onChange={e => setNewExerciseName(e.target.value)}
              placeholder="e.g., Bench Press"
              className="flex-1 p-4 rounded-xl shadow-sm border border-gray-100"
            />
            <button onClick={addExercise} className="bg-blue-500 text-white p-4 rounded-xl shadow-sm font-bold active:scale-95">
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  const todayWorkouts = db.workout_sessions.filter(s => s.date === getTodayString());

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      <ScreenHeader 
        title="Fitness" 
        rightAction={
          <button onClick={startWorkout} className="text-blue-500"><Plus size={28} /></button>
        }
      />
      <div className="p-4">
        <button onClick={startWorkout} className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl mb-8 shadow-md active:scale-95 transition-transform">
          Start Empty Workout
        </button>

        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2 ml-2">Today's Sessions</h3>
        {todayWorkouts.length === 0 ? (
          <p className="text-center text-gray-400 mt-4">Rest day? No workouts logged yet.</p>
        ) : (
          <div className="space-y-4">
            {todayWorkouts.map(session => (
              <Card key={session.id} className="p-4">
                <h4 className="font-bold text-lg mb-1">{session.name}</h4>
                <p className="text-sm text-gray-500">{session.exercises.length} Exercises</p>
                <div className="mt-2 text-sm text-gray-600">
                  Volume: {session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s=>s.is_completed).reduce((sAcc, set) => sAcc + (set.weight * set.reps), 0), 0)} kg
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 4. MEDICATION MODULE
const MedicationScreen = () => {
  const { db, updateDb, addXP, showToast } = useContext(AppContext);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', time: '08:00' });

  const today = getTodayString();
  const meds = db.medication_definitions;
  const todayLogs = db.medication_logs.filter(l => l.date === today);

  const saveMed = () => {
    if (!newMed.name) return;
    updateDb(state => {
      state.medication_definitions.push({
        id: "med_" + Date.now(),
        ...newMed
      });
      return state;
    });
    setShowAdd(false);
    showToast("Medication added. Local notification scheduled.");
  };

  const markTaken = (medId) => {
    // Check if already taken today
    if (todayLogs.find(l => l.medication_id === medId && l.status === 'taken')) return;

    updateDb(state => {
      state.medication_logs.push({
        id: "log_" + Date.now(),
        medication_id: medId,
        date: today,
        taken_at: new Date().toISOString(),
        status: 'taken'
      });
      return state;
    });
    addXP(20, "Medication logged on time!");
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      <ScreenHeader 
        title="Medication" 
        rightAction={<button onClick={() => setShowAdd(true)} className="text-blue-500"><Plus size={28} /></button>}
      />

      {showAdd && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-12 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">New Medication</h2>
              <button onClick={() => setShowAdd(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <input 
                placeholder="Medication Name" 
                className="w-full bg-gray-100 p-4 rounded-xl"
                onChange={e => setNewMed({...newMed, name: e.target.value})}
              />
              <input 
                placeholder="Dosage (e.g., 200mg)" 
                className="w-full bg-gray-100 p-4 rounded-xl"
                onChange={e => setNewMed({...newMed, dosage: e.target.value})}
              />
              {/* Native iOS Time Picker mock */}
              <div className="bg-gray-100 p-4 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-gray-700">Reminder Time</span>
                <input 
                  type="time" 
                  value={newMed.time}
                  onChange={e => setNewMed({...newMed, time: e.target.value})}
                  className="bg-transparent font-bold text-blue-500 text-lg outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 text-center">Using web fallback for Notifee background triggers.</p>
              
              <button onClick={saveMed} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl mt-4">
                Save & Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {meds.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <Pill size={48} className="mx-auto mb-4 opacity-20" />
            <p>No medications configured.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            {meds.map((med, idx) => {
              const isTaken = todayLogs.some(l => l.medication_id === med.id && l.status === 'taken');
              return (
                <div key={med.id} className={`p-4 flex items-center justify-between ${idx !== meds.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${isTaken ? 'bg-green-100 text-green-500' : 'bg-blue-100 text-blue-500'}`}>
                      <Pill size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{med.name}</h4>
                      <p className="text-sm text-gray-500">{med.dosage} • {med.time}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => markTaken(med.id)}
                    disabled={isTaken}
                    className={`px-4 py-2 rounded-full font-bold transition-all ${isTaken ? 'bg-green-50 text-green-600' : 'bg-blue-500 text-white shadow-md active:scale-95'}`}
                  >
                    {isTaken ? 'Taken' : 'Take'}
                  </button>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
};

// 5. SETTINGS SCREEN
const SettingsScreen = () => {
  const { db, updateDb } = useContext(AppContext);
  const toggle = (module) => {
    updateDb(state => {
      state.active_modules[module] = !state.active_modules[module];
      return state;
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <ScreenHeader title="Settings" />
      <div className="p-4">
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2 ml-2">Active Modules</h3>
        <p className="text-xs text-gray-400 mb-4 ml-2">Toggle features to customize your dashboard. Data is preserved even if disabled.</p>
        
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-500 p-1.5 rounded-lg text-white"><Apple size={20}/></div>
              <span className="font-semibold text-lg">Nutrition</span>
            </div>
            <IOSSwitch checked={db.active_modules.nutrition} onChange={() => toggle('nutrition')} />
          </div>
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 p-1.5 rounded-lg text-white"><Activity size={20}/></div>
              <span className="font-semibold text-lg">Fitness</span>
            </div>
            <IOSSwitch checked={db.active_modules.fitness} onChange={() => toggle('fitness')} />
          </div>
          <div className="flex items-center justify-between p-4 bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-green-500 p-1.5 rounded-lg text-white"><Pill size={20}/></div>
              <span className="font-semibold text-lg">Medication</span>
            </div>
            <IOSSwitch checked={db.active_modules.medication} onChange={() => toggle('medication')} />
          </div>
        </Card>

        <div className="mt-12 text-center text-xs text-gray-400">
          <p>Gamified Tracker Prototype</p>
          <p>Simulating React Native Offline-First Architecture</p>
          <p>Data stored locally in browser.</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="mt-4 text-red-400 p-2"
          >
            Reset Database
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN NAVIGATION CONTAINER ---
const MainApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const { db } = useContext(AppContext);
  const { nutrition, fitness, medication } = db.active_modules;

  // Bottom Tab Configuration based on active modules
  const tabs = [{ id: 'home', icon: Home, label: 'Home' }];
  if (nutrition) tabs.push({ id: 'nutrition', icon: Apple, label: 'Nutrition' });
  if (fitness) tabs.push({ id: 'fitness', icon: Activity, label: 'Fitness' });
  if (medication) tabs.push({ id: 'medication', icon: Pill, label: 'Meds' });
  tabs.push({ id: 'settings', icon: SettingsIcon, label: 'Settings' });

  // Safety check if active tab module gets disabled
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab('home');
    }
  }, [nutrition, fitness, medication, activeTab, tabs]);

  return (
    <div className="h-screen w-full flex justify-center bg-gray-900 font-sans text-gray-900 overflow-hidden">
      {/* Mobile Device Container Constraint for Web Prototype */}
      <div className="w-full max-w-md bg-white relative h-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'nutrition' && <NutritionScreen />}
          {activeTab === 'fitness' && <FitnessScreen />}
          {activeTab === 'medication' && <MedicationScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </div>

        {/* Blurred iOS Bottom Tab Bar */}
        <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-lg border-t border-gray-200/50 pb-safe pt-2 px-2 flex justify-around z-30">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => { triggerHaptic('light'); setActiveTab(tab.id); }}
                className={`flex flex-col items-center justify-center w-16 h-12 mb-2 transition-colors ${isActive ? 'text-blue-500' : 'text-gray-400'}`}
              >
                <Icon size={24} className={isActive ? 'fill-current opacity-20 stroke-[3]' : 'stroke-2'} />
                <span className="text-[10px] font-medium mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Custom Styles for styling hiding scrollbar and animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
