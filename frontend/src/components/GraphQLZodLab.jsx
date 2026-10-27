import React, { useState } from 'react';
import { z } from 'zod';

const commentSchema = z.object({
  id: z.string(),
  content: z.string().nullable()
}).strict();

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  comments: z.array(commentSchema).nullable()
}).strict();

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  posts: z.array(postSchema).nullable()
}).strict();

const queryDataSchema = z.object({
  user: userSchema.nullable()
}).strict();

const mutationDataSchema = z.object({
  createPost: postSchema.nullable()
}).strict();

const graphQLErrorSchema = z.object({
  message: z.string(),
  path: z.array(z.union([z.string(), z.number()])).optional()
}).passthrough();

const queryResponseSchema = z.object({
  data: queryDataSchema.nullable().optional(),
  errors: z.array(graphQLErrorSchema).optional()
}).strict();

const mutationResponseSchema = z.object({
  data: mutationDataSchema.nullable().optional(),
  errors: z.array(graphQLErrorSchema).optional()
}).strict();

const users = {
  usr_101: {
    id: 'usr_101',
    name: 'Ada Yılmaz',
    posts: [
      {
        id: 'post_201',
        title: 'GraphQL ve Zod',
        comments: [
          { id: 'comment_301', content: 'Yanıt şemasını runtime’da doğrulamak önemli.' },
          { id: 'comment_302', content: null }
        ]
      },
      {
        id: 'post_202',
        title: 'Veri Alma Mimarileri',
        comments: []
      }
    ]
  },
  usr_102: {
    id: 'usr_102',
    name: 'Bora Demir',
    posts: [
      {
        id: 'post_203',
        title: 'API Tasarımı',
        comments: [{ id: 'comment_303', content: 'GraphQL tek endpoint kullanır.' }]
      }
    ]
  }
};

const queryDocument = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    posts {
      id
      title
      comments { id content }
    }
  }
}`;

const mutationDocument = `mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    comments { id content }
  }
}`;

const fetchExample = `// Fetch ile GraphQL POST isteği
const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: GetUserDocument,
    variables: { id: 'usr_101' }
  })
});

if (!response.ok) {
  throw new Error(\`HTTP \${response.status}\`);
}

const raw: unknown = await response.json();
const parsed = GraphQLResponseSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error('API yanıtı beklenen şemaya uymuyor');
}

// GraphQL errors, HTTP 200 yanıtıyla birlikte gelebilir.
return parsed.data;`;

const apolloExample = `// Apollo Client + Zod: Apollo yanıtını runtime'da ayrıca doğrulayın
const result = await client.query({
  query: GetUserDocument,
  variables: { id: 'usr_101' },
  errorPolicy: 'all'
});

const parsed = GetUserResponseSchema.safeParse(result.data);
if (!parsed.success) {
  throw new Error('GraphQL data şeması geçersiz');
}

// Apollo link zincirinde ortak doğrulama yapılabilir.
// İstemcinin TypeScript tipleri sunucu yanıtını doğrulamaz.`;

const malformedResponse = {
  data: {
    user: {
      id: 'usr_101',
      name: 'Ada Yılmaz',
      posts: 'array olması gerekirken metin'
    }
  }
};

export function GraphQLZodLab() {
  const [operation, setOperation] = useState('query');
  const [userId, setUserId] = useState('usr_101');
  const [scenario, setScenario] = useState('success');
  const [postTitle, setPostTitle] = useState('Zod ile API yanıtı doğrulama');
  const [responseText, setResponseText] = useState('');
  const [validation, setValidation] = useState(null);
  const [logs, setLogs] = useState([]);
  const [createdPosts, setCreatedPosts] = useState([]);

  const addLog = (message, type = 'info') => {
    setLogs((previous) => [
      { id: `${Date.now()}-${Math.random()}`, message, type },
      ...previous
    ]);
  };

  const buildQueryResponse = () => {
    if (scenario === 'malformed') return malformedResponse;

    if (scenario === 'not-found') {
      return {
        data: { user: null },
        errors: [{ message: 'User not found', path: ['user'] }]
      };
    }

    const user = users[userId];
    if (!user) {
      return {
        data: { user: null },
        errors: [{ message: 'User not found', path: ['user'] }]
      };
    }

    if (scenario === 'partial') {
      return {
        data: {
          user: {
            ...user,
            posts: user.posts.map((post, index) => (
              index === 0 ? { ...post, comments: null } : post
            ))
          }
        },
        errors: [{
          message: 'Yorum servisi geçici olarak kullanılamıyor.',
          path: ['user', 'posts', 0, 'comments']
        }]
      };
    }

    return { data: { user } };
  };

  const executeOperation = () => {
    setValidation(null);
    let payload;

    if (operation === 'query') {
      payload = buildQueryResponse();
      addLog(`POST /graphql · GetUser({ id: "${userId}" }) çalıştırıldı.`, 'info');
    } else if (!postTitle.trim() || postTitle.trim().length > 80) {
      setValidation({
        valid: false,
        errors: ['Başlık zorunludur ve en fazla 80 karakter olabilir.']
      });
      addLog('Mutation çalıştırılmadı: başlık doğrulaması başarısız.', 'danger');
      return;
    } else {
      const post = {
        id: `post_local_${createdPosts.length + 1}`,
        title: postTitle.trim(),
        comments: []
      };
      setCreatedPosts((previous) => [post, ...previous]);
      payload = scenario === 'malformed'
        ? malformedResponse
        : { data: { createPost: post } };
      addLog('POST /graphql · CreatePost(input) mutation çalıştırıldı (yerel demo).', 'info');
    }

    setResponseText(JSON.stringify(payload, null, 2));
    validateResponse(payload);
  };

  const validateResponse = (payloadToValidate) => {
    let decoded = payloadToValidate;
    if (typeof payloadToValidate === 'string') {
      try {
        decoded = JSON.parse(payloadToValidate);
      } catch {
        const errors = ['Yanıt geçerli JSON değil.'];
        setValidation({ valid: false, errors });
        addLog(errors[0], 'danger');
        return;
      }
    }

    const responseSchema = operation === 'query' ? queryResponseSchema : mutationResponseSchema;
    const result = responseSchema.safeParse(decoded);
    if (!result.success) {
      const errors = result.error.issues.map((issue) =>
        `${issue.path.join('.') || 'response'}: ${issue.message}`
      );
      setValidation({ valid: false, errors });
      addLog(`GraphQL yanıtı Zod şemasını geçemedi (${errors.length} hata).`, 'danger');
      return;
    }

    const data = result.data.data;
    const dataValidation = data === undefined || data === null
      ? { success: true, data }
      : (operation === 'query' ? queryDataSchema : mutationDataSchema).safeParse(data);

    if (!dataValidation.success) {
      const errors = dataValidation.error.issues.map((issue) =>
        `data.${issue.path.join('.') || 'response'}: ${issue.message}`
      );
      setValidation({ valid: false, errors });
      addLog(`GraphQL data alanı Zod şemasını geçemedi (${errors.length} hata).`, 'danger');
      return;
    }

    const graphQLErrors = result.data.errors ?? [];
    setValidation({
      valid: true,
      data: dataValidation.data,
      graphQLErrors
    });
    if (graphQLErrors.length > 0) {
      addLog(
        `Yanıt şekli doğrulandı; data ile birlikte ${graphQLErrors.length} GraphQL hatası döndü (partial response).`,
        'warning'
      );
    } else {
      addLog('Yanıt zarfı ve data şeması doğrulandı.', 'success');
    }
  };

  const setScenarioAndClear = (nextScenario) => {
    setScenario(nextScenario);
    setValidation(null);
  };

  const applyMalformedExample = () => {
    setOperation('query');
    setScenario('malformed');
    setResponseText(JSON.stringify(malformedResponse, null, 2));
    setValidation(null);
  };

  const document = operation === 'query' ? queryDocument : mutationDocument;

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>
          Hafta 9: GraphQL Entegrasyonu ve Zod ile Yanıt Doğrulaması
        </h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.55 }}>
          Query ile veri okuyun, Mutation ile değişiklik yapın ve API’nin çalışma zamanında
          döndürdüğü iç içe JSON’u Zod ile doğrulayın.
        </p>
      </div>

      <div style={cardsGridStyle}>
        <ConceptCard title="REST" text="Kaynak başına endpoint. Over-fetching veya eksik veri için birden fazla istek gerekebilir." />
        <ConceptCard title="GraphQL Query" text="Tek endpoint’ten istemcinin istediği alanları okur; alanları ve değişkenleri açıkça tanımlar." />
        <ConceptCard title="Mutation" text="Sunucudaki veriyi oluşturur, günceller veya siler. İstek doğrulaması sunucuda da yapılmalıdır." />
        <ConceptCard title="Runtime doğrulama" text="TypeScript derleme tipleri API yanıtını doğrulamaz. Bilinmeyen JSON’u uygulamadan önce parse edin." />
      </div>

      <div style={operationTabsStyle} role="group" aria-label="GraphQL işlemi">
        <button type="button" aria-pressed={operation === 'query'} onClick={() => { setOperation('query'); setValidation(null); }} style={tabStyle(operation === 'query')}>
          Query · Oku
        </button>
        <button type="button" aria-pressed={operation === 'mutation'} onClick={() => { setOperation('mutation'); setValidation(null); }} style={tabStyle(operation === 'mutation')}>
          Mutation · Yaz
        </button>
      </div>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={panelTitleStyle}>İstek ve demo senaryosu</h3>
          <span style={badgeStyle}>POST /graphql · JSON variables</span>
        </div>
        {operation === 'query' ? (
          <label style={fieldLabelStyle}>
            Sorgulanacak kullanıcı
            <select value={userId} onChange={(event) => setUserId(event.target.value)} style={selectStyle}>
              <option value="usr_101">usr_101 · Ada Yılmaz</option>
              <option value="usr_102">usr_102 · Bora Demir</option>
              <option value="usr_404">usr_404 · Bulunamayan kullanıcı</option>
            </select>
          </label>
        ) : (
          <label style={fieldLabelStyle}>
            Yeni gönderi başlığı
            <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} maxLength={100} style={inputStyle} />
          </label>
        )}

        <label style={{ ...fieldLabelStyle, marginTop: '9px' }}>
          Yanıt senaryosu
          <select value={scenario} onChange={(event) => setScenarioAndClear(event.target.value)} style={selectStyle}>
            <option value="success">Başarılı yanıt</option>
            <option value="partial">Kısmi hata · nullable alan</option>
            <option value="not-found">Bulunamayan kullanıcı</option>
            <option value="malformed">Hatalı yanıt şekli</option>
          </select>
        </label>

        <pre style={codeBlockStyle}><code>{document}</code></pre>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          <button type="button" onClick={executeOperation} style={buttonStyle('#1d4ed8')}>
            {operation === 'query' ? 'Query çalıştır' : 'Mutation çalıştır'}
          </button>
          <button type="button" onClick={applyMalformedExample} style={buttonStyle('#b45309')}>
            Hatalı JSON yanıtı yükle
          </button>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={panelTitleStyle}>GraphQL yanıtı · güvenilmeyen dış veri</h3>
          <button type="button" onClick={() => validateResponse(responseText)} disabled={!responseText} style={buttonStyle('#047857')}>
            JSON’u Zod ile doğrula
          </button>
        </div>
        <textarea
          aria-label="GraphQL JSON yanıtı"
          value={responseText}
          onChange={(event) => { setResponseText(event.target.value); setValidation(null); }}
          placeholder="Önce query veya mutation çalıştırın; ardından JSON'u düzenleyip tekrar doğrulayabilirsiniz."
          rows={10}
          spellCheck="false"
          style={textareaStyle}
        />
        {validation && (
          <div role="status" style={{
            marginTop: '9px',
            padding: '9px',
            borderRadius: '4px',
            backgroundColor: validation.valid ? (validation.graphQLErrors.length ? '#fffbeb' : '#f0fdf4') : '#fef2f2',
            color: validation.valid ? (validation.graphQLErrors.length ? '#92400e' : '#166534') : '#991b1b',
            fontSize: '10px'
          }}>
            <strong>
              {validation.valid
                ? validation.graphQLErrors.length
                  ? `Yanıt şekli geçerli · ${validation.graphQLErrors.length} GraphQL hatası var`
                  : 'Yanıt ve data şeması geçerli'
                : 'Yanıt doğrulanamadı'}
            </strong>
            {validation.valid && validation.graphQLErrors.map((error, index) => (
              <div key={`${error.message}-${index}`} style={{ marginTop: '4px' }}>
                {error.message}{error.path ? ` · path: ${error.path.join('.')}` : ''}
              </div>
            ))}
            {!validation.valid && validation.errors.map((error) => (
              <div key={error} style={{ marginTop: '4px' }}>• {error}</div>
            ))}
            {validation.valid && validation.data && (
              <div style={{ marginTop: '5px' }}>
                Doğrulanmış alan: {operation === 'query'
                  ? validation.data.user?.name ?? 'user: null'
                  : validation.data.createPost?.title ?? 'createPost: null'}
              </div>
            )}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={panelTitleStyle}>İç içe Zod şeması · GraphQL nullability ile eşleşmeli</h3>
        <pre style={codeBlockStyle}><code>{`const CommentSchema = z.object({
  id: z.string(),
  content: z.string().nullable()
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  comments: z.array(CommentSchema).nullable()
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  posts: z.array(PostSchema).nullable()
});

const GetUserResponseSchema = z.object({
  data: z.object({
    user: UserSchema.nullable()
  }).nullable().optional(),
  errors: z.array(GraphQLErrorSchema).optional()
});`}</code></pre>
        <p style={noteStyle}>
          GraphQL’de nullable bir alan null olabilir; alan non-null ise hata üst nesneye yayılabilir.
          Bu yüzden şemayı gerçek GraphQL tipleriyle eşleştirin ve <code>data</code> ile <code>errors</code> alanlarını birlikte ele alın.
        </p>
      </section>

      <section style={panelStyle}>
        <h3 style={panelTitleStyle}>İstek stratejisi · Fetch API ve Apollo Client</h3>
        <CodeBlock title="Fetch · POST body içinde query + variables" code={fetchExample} />
        <CodeBlock title="Apollo Client · errorPolicy ve runtime parse" code={apolloExample} />
        <p style={noteStyle}>
          Apollo Client projeye ekli değil; yukarıdaki bölüm entegrasyon örneğidir. Bu laboratuvarın çalışan
          simülatörü, aynı request/response ve Zod doğrulama adımlarını ağ isteği yapmadan gösterir.
        </p>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={panelTitleStyle}>Mutation sonucunda oluşan yerel gönderiler</h3>
          <span style={badgeStyle}>{createdPosts.length} kayıt</span>
        </div>
        {createdPosts.length === 0
          ? <p style={noteStyle}>Henüz demo mutation çalıştırılmadı.</p>
          : createdPosts.map((post) => (
            <div key={post.id} style={createdPostStyle}>
              <strong>{post.title}</strong><span style={{ color: '#64748b' }}> · {post.id}</span>
            </div>
          ))}
      </section>

      <section style={logPanelStyle}>
        <h3 style={{ margin: '0 0 7px', fontSize: '11px', color: '#cbd5e1' }}>İstek ve doğrulama kayıtları</h3>
        {logs.length === 0
          ? <span style={{ color: '#64748b' }}>Bir query veya mutation çalıştırın.</span>
          : logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', color: log.type === 'danger' ? '#fca5a5' : log.type === 'success' ? '#86efac' : log.type === 'warning' ? '#fcd34d' : '#cbd5e1' }}>
              {log.message}
            </div>
          ))}
      </section>

      <p style={noteStyle}>
        Öğrenme hedefi: GraphQL sorgusu yalnızca alan seçimini ifade eder; sunucudaki yetkilendirme ve
        girdi doğrulamasının yerini tutmaz. İstemciden gelen query, variables ve yanıt için uygun boyut,
        derinlik ve tip kontrollerini uygulayın.
      </p>
    </div>
  );
}

function ConceptCard({ title, text }) {
  return (
    <div style={conceptCardStyle}>
      <strong style={{ display: 'block', color: '#111827', fontSize: '11px', marginBottom: '4px' }}>{title}</strong>
      <span style={{ color: '#475569', fontSize: '10px', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function CodeBlock({ title, code }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <strong style={{ display: 'block', color: '#475569', fontSize: '10px', marginBottom: '4px' }}>{title}</strong>
      <pre style={codeBlockStyle}><code>{code}</code></pre>
    </div>
  );
}

const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '12px' };
const cardsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '7px', marginBottom: '12px' };
const conceptCardStyle = { padding: '9px', border: '1px solid #e2e8f0', borderRadius: '5px', backgroundColor: '#f8fafc' };
const operationTabsStyle = { display: 'flex', gap: '5px', marginBottom: '9px' };
const panelStyle = { border: '1px solid #e5e7eb', borderRadius: '6px', padding: '11px', marginBottom: '10px' };
const sectionHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' };
const panelTitleStyle = { margin: 0, color: '#111827', fontSize: '12px' };
const badgeStyle = { padding: '3px 6px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '9px' };
const fieldLabelStyle = { display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155', fontSize: '10px', fontWeight: 600 };
const selectStyle = { minHeight: '31px', padding: '5px 7px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#111827', fontSize: '10px' };
const inputStyle = { minHeight: '31px', padding: '5px 7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px' };
const textareaStyle = { width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5, resize: 'vertical' };
const codeBlockStyle = { margin: '8px 0', padding: '9px', overflowX: 'auto', borderRadius: '4px', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '9px', lineHeight: 1.5 };
const noteStyle = { color: '#64748b', fontSize: '10px', lineHeight: 1.5, margin: '8px 0 0' };
const createdPostStyle = { padding: '7px', marginTop: '5px', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#334155', fontSize: '10px' };
const logPanelStyle = { border: '1px solid #111827', borderRadius: '6px', backgroundColor: '#0f172a', padding: '11px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '10px' };
const buttonStyle = (backgroundColor) => ({ minHeight: '30px', padding: '6px 9px', border: 'none', borderRadius: '4px', backgroundColor, color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 600 });
const tabStyle = (active) => ({ ...buttonStyle(active ? '#1d4ed8' : '#e2e8f0'), color: active ? '#fff' : '#334155' });
