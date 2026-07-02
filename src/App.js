import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

class DataStore {
  constructor() {
    this.DB_NAME = 'qa_dashboard_db';
    this.VERSION = 1;
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('apps')) {
          db.createObjectStore('apps', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('testcases')) {
          db.createObjectStore('testcases', { keyPath: 'tcId' });
        }
      };
    });
  }

  async getAll(storeName) {
    await this.initPromise;
    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put(storeName, data) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const dataStore = new DataStore();

const COLORS = {
  primary: '#0066CC',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
  bg: '#FAFAFA',
};

const STATUS_COLORS = {
  '미수행': '#9E9E9E',
  '진행중': '#FF9800',
  'Pass': '#4CAF50',
  'Fail': '#F44336',
  '보류': '#2196F3',
  '제외': '#BDBDBD',
};

export default function QADashboard() {
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const appsList = await dataStore.getAll('apps');
      
      if (appsList.length === 0) {
        const initialApps = [
          {
            id: 'SB-ORDER',
            name: 'SB 주문',
            icon: '📦',
            description: '주문 관리 애플리케이션',
            version: '1.0.0',
            lastModified: new Date().toISOString(),
          },
          {
            id: 'KT-LOGIN',
            name: 'KT 로그인',
            icon: '🔐',
            description: '로그인 및 인증 서비스',
            version: '1.2.5',
            lastModified: new Date().toISOString(),
          },
          {
            id: 'TADA-CALL',
            name: 'TADA 호출',
            icon: '📞',
            description: '호출 및 통화 관리',
            version: '2.1.0',
            lastModified: new Date().toISOString(),
          },
        ];

        for (const app of initialApps) {
          await dataStore.put('apps', app);
        }
        
        setApps(initialApps);
      } else {
        setApps(appsList);
      }
    } catch (error) {
      console.error('앱 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedApp = apps.find(app => app.id === selectedAppId);

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <h2>로딩 중...</h2>
      </div>
    );
  }

  return (
    <div style={{display: 'flex', minHeight: '100vh', background: COLORS.bg, fontFamily: 'system-ui, sans-serif'}}>
      {!selectedApp ? (
        <HomeView apps={apps} onSelectApp={setSelectedAppId} onRefresh={loadApps} />
      ) : (
        <AppDetailView app={selectedApp} onBack={() => setSelectedAppId(null)} onRefresh={loadApps} />
      )}
    </div>
  );
}

function HomeView({ apps, onSelectApp, onRefresh }) {
  const totalTC = apps.reduce((sum, app) => sum + (app.testCaseCount || 0), 0);

  return (
    <div style={{flex: 1, padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%'}}>
      <div style={{marginBottom: '30px'}}>
        <h1 style={{fontSize: '28px', fontWeight: 600, color: COLORS.primary, margin: '0 0 10px 0'}}>
          📊 QA Test Case 관리 시스템
        </h1>
        <p style={{fontSize: '14px', color: '#666', margin: 0}}>
          모든 팀원이 함께 관리하는 테스트 케이스
        </p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px'}}>
        {apps.map(app => (
          <div 
            key={app.id} 
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${COLORS.border}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => onSelectApp(app.id)}
          >
            <div style={{fontSize: '32px', marginBottom: '10px'}}>{app.icon}</div>
            <h3 style={{fontSize: '16px', fontWeight: 600, margin: '0 0 5px 0', color: COLORS.primary}}>
              {app.name}
            </h3>
            <p style={{fontSize: '13px', color: '#666', margin: '0 0 10px 0'}}>
              {app.description}
            </p>
            <div style={{fontSize: '12px', color: '#999', display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px solid ${COLORS.border}`}}>
              <span>TC: {app.testCaseCount || 0}개</span>
              <span>v{app.version}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign: 'center', marginTop: '40px', padding: '20px', background: 'white', borderRadius: '8px', border: `2px dashed ${COLORS.primary}`}}>
        <button onClick={onRefresh} style={{padding: '10px 20px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500}}>
          🔄 새로고침
        </button>
        <p style={{margin: '10px 0 0 0', color: '#666', fontSize: '14px'}}>
          💡 팀원들과 이 링크를 공유하세요. 모두가 같은 데이터를 볼 수 있습니다!
        </p>
      </div>
    </div>
  );
}

function AppDetailView({ app, onBack, onRefresh }) {
  const [testCases, setTestCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    majorFunction: '',
    checkItems: '',
    expectedResults: '',
    priority: 'Medium',
    status: '미수행',
    owner: '',
  });

  useEffect(() => {
    loadTestCases();
  }, [app.id]);

  const loadTestCases = async () => {
    try {
      const allTC = await dataStore.getAll('testcases');
      const appTC = allTC.filter(tc => tc.appId === app.id);
      setTestCases(appTC);
    } catch (error) {
      console.error('TC 로드 실패:', error);
    }
  };

  const generateTCId = () => {
    const maxNum = Math.max(
      0,
      ...testCases
        .filter(tc => tc.tcId.startsWith(app.id + '-'))
        .map(tc => {
          const num = tc.tcId.split('-').pop();
          return isNaN(num) ? 0 : parseInt(num);
        })
    );
    return `${app.id}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleAddTestCase = async () => {
    if (!formData.majorFunction.trim()) {
      alert('주요기능을 입력하세요');
      return;
    }

    const newTC = {
      tcId: generateTCId(),
      appId: app.id,
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await dataStore.put('testcases', newTC);
      setTestCases([...testCases, newTC]);
      setFormData({
        majorFunction: '',
        checkItems: '',
        expectedResults: '',
        priority: 'Medium',
        status: '미수행',
        owner: '',
      });
      alert('테스트 케이스가 추가되었습니다!');
    } catch (error) {
      alert('추가 실패: ' + error.message);
    }
  };

  const handleDeleteTestCase = async (tcId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      await dataStore.delete('testcases', tcId);
      setTestCases(testCases.filter(tc => tc.tcId !== tcId));
      alert('삭제되었습니다!');
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  };

  const filteredTC = testCases.filter(tc => {
    const matchSearch = tc.tcId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tc.majorFunction.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || tc.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleExportExcel = () => {
    const data = filteredTC.map(tc => ({
      'TC ID': tc.tcId,
      '주요기능': tc.majorFunction,
      '체크항목': tc.checkItems,
      '예상결과': tc.expectedResults,
      '우선순위': tc.priority,
      '검증상태': tc.status,
      '담당자': tc.owner,
      '수정일': new Date(tc.updatedAt).toLocaleDateString('ko-KR'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TestCases');
    XLSX.writeFile(wb, `${app.id}_TestCases_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{flex: 1, padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%'}}>
      <button onClick={onBack} style={{padding: '10px 20px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px'}}>
        ← 돌아가기
      </button>

      <div style={{marginBottom: '30px'}}>
        <h1 style={{fontSize: '28px', fontWeight: 600, color: COLORS.primary, margin: '0 0 10px 0'}}>
          {app.icon} {app.name}
        </h1>
        <p style={{fontSize: '14px', color: '#666', margin: 0}}>
          v{app.version} • 총 {testCases.length}개 TC
        </p>
      </div>

      <div style={{background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${COLORS.border}`}}>
        <h3 style={{fontSize: '16px', fontWeight: 600, color: COLORS.primary, margin: '0 0 15px 0'}}>
          새 테스트 케이스 추가
        </h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <input
            type="text"
            placeholder="주요기능 (필수)"
            value={formData.majorFunction}
            onChange={e => setFormData({...formData, majorFunction: e.target.value})}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px'}}
          />
          <input
            type="text"
            placeholder="담당자"
            value={formData.owner}
            onChange={e => setFormData({...formData, owner: e.target.value})}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px'}}
          />
          <select
            value={formData.priority}
            onChange={e => setFormData({...formData, priority: e.target.value})}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px'}}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <select
            value={formData.status}
            onChange={e => setFormData({...formData, status: e.target.value})}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px'}}
          >
            <option value="미수행">미수행</option>
            <option value="진행중">진행중</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
            <option value="보류">보류</option>
          </select>
          <textarea
            placeholder="체크항목"
            value={formData.checkItems}
            onChange={e => setFormData({...formData, checkItems: e.target.value})}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px', minHeight: '80px'}}
          />
          <textarea
            placeholder="예상결과"
            value={formData.expectedResults}
            onChange={e => setFormData({...formData, expectedResults: e.target.value})}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px', minHeight: '80px'}}
          />
          <button onClick={handleAddTestCase} style={{padding: '10px 20px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500}}>
            TC 추가
          </button>
        </div>
      </div>

      <div style={{background: 'white', padding: '20px', borderRadius: '8px', border: `1px solid ${COLORS.border}`}}>
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
          <input
            type="text"
            placeholder="TC ID 또는 기능으로 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px', flex: 1}}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '13px'}}
          >
            <option value="all">모든 상태</option>
            <option value="미수행">미수행</option>
            <option value="진행중">진행중</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          <button onClick={handleExportExcel} style={{padding: '10px 20px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'}}>
            📥 Excel
          </button>
        </div>

        <h3 style={{fontSize: '16px', fontWeight: 600, color: COLORS.primary, margin: '0 0 15px 0'}}>
          테스트 케이스 목록 ({filteredTC.length})
        </h3>

        {filteredTC.length === 0 ? (
          <p style={{textAlign: 'center', color: '#999'}}>등록된 TC가 없습니다.</p>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{background: COLORS.primary, color: 'white'}}>
                  <th style={{padding: '10px', textAlign: 'left', fontWeight: 600}}>TC ID</th>
                  <th style={{padding: '10px', textAlign: 'left', fontWeight: 600}}>주요기능</th>
                  <th style={{padding: '10px', textAlign: 'left', fontWeight: 600}}>우선순위</th>
                  <th style={{padding: '10px', textAlign: 'left', fontWeight: 600}}>상태</th>
                  <th style={{padding: '10px', textAlign: 'left', fontWeight: 600}}>담당자</th>
                  <th style={{padding: '10px', textAlign: 'left', fontWeight: 600}}>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredTC.map(tc => (
                  <tr key={tc.tcId} style={{borderBottom: `1px solid ${COLORS.border}`}}>
                    <td style={{padding: '10px', textAlign: 'left'}}>
                      <strong style={{color: COLORS.primary}}>{tc.tcId}</strong>
                    </td>
                    <td style={{padding: '10px', textAlign: 'left'}}>{tc.majorFunction}</td>
                    <td style={{padding: '10px', textAlign: 'left'}}>{tc.priority}</td>
                    <td style={{padding: '10px', textAlign: 'left'}}>
                      <span style={{
                        background: STATUS_COLORS[tc.status],
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        {tc.status}
                      </span>
                    </td>
                    <td style={{padding: '10px', textAlign: 'left'}}>{tc.owner || '-'}</td>
                    <td style={{padding: '10px', textAlign: 'left'}}>
                      <button
                        onClick={() => handleDeleteTestCase(tc.tcId)}
                        style={{padding: '5px 10px', background: COLORS.error, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
Step 3️⃣: GitHub에 붙여넣기
GitHub의 큰 텍스트 칸을 클릭한 후:

Ctrl + V (또는 Cmd + V)

→ 코드가 붙여넣어집니다!
Step 4️⃣: [Commit changes] 클릭
화면 아래 [Commit changes] 클릭!

팝업 → [Commit changes] 클릭!

✅ 완료!

✅ 파일 3개 모두 완료!
┌──────────────────────────┐
│ qa-dashboard/            │
│ ├─ package.json    ✓    │
│ ├─ public/               │
│ │  └─ index.html   ✓    │
│ └─ src/                  │
│    └─ App.js      ✓    │
