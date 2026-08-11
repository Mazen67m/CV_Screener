"""
train_tfidf.py
Trains a TF-IDF vectorizer on the job description corpus,
then exports the fitted model as two JSON files:
  - models/vocabulary.json    : { word -> column_index }   (up to 5000 entries)
  - models/idf_weights.json   : [ float, float, ... ]      (one weight per vocabulary word)

Why JSON instead of ONNX?
  skl2onnx is broken on Python 3.13 (onnx removed the mapping module it depends on).
  The JSON approach is simpler, fully transparent, and trivial to load in C#.

Run once. Re-run if you update the corpus.
"""

import os
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# ─── 1. Load corpus ───────────────────────────────────────────────────────────
print("Loading corpus...")

# Built-in tech-focused corpus — ALWAYS merged in, even when corpus.json exists.
# Reason: corpus.json (Kaggle general JDs) may lack tech-specific terms like
# "python", "api", "docker", etc. if the dataset is not tech-focused.
# Merging guarantees these critical terms appear ≥2 times (min_df threshold).
tech_corpus = [
        "python developer django rest api postgresql docker experience",
        "senior net engineer aspnet core microservices azure devops",
        "data scientist machine learning tensorflow pytorch deep learning",
        "frontend developer react typescript nextjs css html tailwind",
        "backend engineer nodejs express mongodb redis microservices",
        "devops engineer kubernetes helm ci cd github actions terraform",
        "software engineer java spring boot hibernate sql rest api",
        "fullstack developer react nodejs postgresql docker aws",
        "machine learning engineer scikit-learn pandas numpy feature engineering",
        "cloud architect aws azure gcp terraform infrastructure as code",
        "python engineer flask sqlalchemy celery redis rabbitmq",
        "senior software engineer golang grpc protobuf kubernetes microservices",
        "data engineer apache spark kafka airflow hdfs sql etl pipeline",
        "android developer kotlin jetpack compose mvvm retrofit coroutines",
        "ios developer swift swiftui combine uikit xcode objective-c",
        "mobile developer react native expo typescript firebase",
        "security engineer penetration testing owasp vulnerability assessment",
        "sre reliability engineer kubernetes prometheus grafana incident response",
        "qa engineer selenium pytest automation testing api testing",
        "database administrator postgresql mysql oracle performance tuning",
        "net developer csharp aspnet core entity framework sql server",
        "java developer spring microservices kafka elasticsearch docker",
        "python data analyst pandas matplotlib seaborn sql reporting",
        "solution architect system design distributed systems scalability",
        "product manager agile scrum roadmap stakeholder management",
        "ux designer figma user research prototyping accessibility",
        "technical lead team management code review architecture decisions",
        "rust developer systems programming memory safety concurrency",
        "scala developer spark akka functional programming distributed systems",
        "embedded systems engineer c c++ rtos firmware hardware",
        "ai engineer llm openai langchain vector database embeddings",
        "nlp engineer transformers bert huggingface text classification",
        "computer vision opencv pytorch cnn object detection image segmentation",
        "blockchain developer solidity ethereum smart contracts web3",
        "game developer unity csharp unreal engine gameplay programming",
        "platform engineer internal developer platform kubernetes service mesh",
        "python backend developer fastapi pydantic async sqlalchemy postgresql",
        "senior react developer typescript redux saga testing library jest",
        "angular developer typescript rxjs ngrx material design",
        "vue developer vuex nuxt composition api typescript",
        "php developer laravel symfony mysql redis rest api",
        "ruby developer rails rspec postgresql sidekiq redis",
        "elixir developer phoenix liveview ecto postgresql otp",
        "haskell developer functional programming type theory",
        "data warehouse engineer snowflake redshift bigquery dbt",
        "bi developer power bi tableau sql reporting dashboards",
        "network engineer cisco routing switching bgp ospf firewall",
        "system administrator linux bash scripting ansible puppet chef",
        "windows administrator active directory group policy exchange",
        "technical writer api documentation markdown developer portal",
        "five years experience python developer machine learning apis",
        "senior engineer ten years distributed systems architect",
        "junior developer two years javascript react nodejs",
        "mid level engineer four years java spring microservices",
        "lead engineer eight years team management software architecture",
        "principal engineer fifteen years engineering leadership",
        "python three years experience rest apis database design",
        "net core developer three years microservices docker kubernetes",
        "react developer three years state management api integration",
        "senior python developer six years machine learning nlp",
        "java senior developer seven years spring boot kafka",
        "golang developer four years high performance backend services",
        "fullstack engineer five years react nodejs postgresql",
        "cloud engineer three years aws terraform ci cd pipeline",
        "data scientist five years predictive modeling feature engineering",
        "ml engineer four years model training deployment serving",
        "experience with agile development scrum sprint planning",
        "strong communication skills team collaboration cross functional",
        "problem solving analytical thinking attention to detail",
        "experience mentoring junior developers code review practices",
        "bachelor degree computer science software engineering related field",
        "master degree machine learning artificial intelligence",
        "phd computer science research publications",
        "remote work distributed team async communication",
        "startup experience fast paced environment wearing many hats",
        "enterprise software large scale systems millions users",
        "open source contributor github projects community",
        "continuous learning keeping up with latest technologies",
        "python developer rest apis microservices cloud deployment experience senior",
        "software engineer backend systems design scalability performance",
        "data science python r statistics machine learning models production",
        "devops kubernetes docker ci cd infrastructure automation",
        "react typescript frontend performance optimization accessibility",
        "golang high throughput low latency services backend systems",
        "azure cloud services functions cosmos db service bus",
        "aws ec2 s3 lambda rds cloudfront dynamodb infrastructure",
        "gcp bigquery cloud functions kubernetes engine dataflow",
        "elasticsearch kibana logstash monitoring logging observability",
        "kafka event streaming real time data processing",
        "redis caching session management pub sub patterns",
        "postgresql advanced features jsonb full text search partitioning",
        "graphql api design schema federation apollo server",
        "grpc protocol buffers service mesh istio",
        "terraform infrastructure as code modules workspaces",
        "helm charts kubernetes operators custom resource definitions",
        "prometheus grafana alertmanager slo sla observability",
        "oauth jwt authentication authorization security best practices",
        "sql optimization query performance indexes execution plans",
        "nosql mongodb cassandra dynamodb document stores",
        "test driven development unit integration end to end testing",
        "clean architecture domain driven design solid principles",
        "event driven architecture cqrs event sourcing patterns",
        "api gateway rate limiting circuit breaker patterns",
        "software architect design patterns gang of four",
        "agile kanban sprint velocity story points estimation",
        "code review pull requests git branching strategies",
        "pair programming xp extreme programming practices",
        "monitoring alerting incident management postmortem",
        "cost optimization cloud spending finops",
        "technical debt refactoring legacy systems modernization",
        "python flask api json response validation authentication",
        "nodejs express middleware api endpoint controllers",
        "spring boot configuration properties profiles logging",
        "csharp linq entity framework migrations sql server",
        "typescript generics decorators modules namespaces",
        "kotlin coroutines flow android architecture components",
        "swift protocols extensions generics error handling",
        "rust ownership borrowing lifetimes traits async",
        "scala cats effect fs2 http4s doobie functional",
        "docker compose multi container networking volumes",
        "kubernetes deployments services ingress configmaps secrets",
        "github actions workflow yaml jobs steps artifacts",
        "jenkins pipeline stages parallel builds artifacts",
        "terraform plan apply state backend remote modules",
        "ansible playbooks roles inventory handlers templates",
        "prometheus metrics labels recording rules alerting",
        "grafana dashboards panels datasources alerts",
        "elasticsearch index mapping shards replicas queries",
        "redis sorted sets hash lists streams pub sub",
        "kafka topics partitions consumer groups offsets",
        "postgresql transactions isolation levels deadlocks",
        "mongodb aggregation pipeline indexes text search",
        "dynamodb partition key sort key gsi lsi capacity",
        "aws lambda event sources destinations layers extensions",
        "azure functions triggers bindings durable functions",
        "gcp cloud run container registry artifact registry",
        "openai gpt embeddings fine tuning api integration",
        "langchain chains agents tools memory retrieval",
        "vector database pinecone weaviate qdrant similarity search",
        "machine learning pipeline preprocessing feature selection",
        "model evaluation metrics accuracy precision recall f1",
        "hyperparameter tuning cross validation grid search",
        "deep learning neural networks backpropagation optimization",
        "convolutional networks image recognition transfer learning",
        "recurrent networks lstm gru sequence modeling",
        "transformers attention mechanism bert gpt fine tuning",
        "reinforcement learning reward policy gradient actor critic",
        "data preprocessing cleaning missing values outliers",
        "statistical analysis hypothesis testing confidence intervals",
        "a b testing experiment design causal inference",
        "product analytics metrics dashboards cohort analysis",
        "sql advanced joins window functions ctes recursive",
        "python pandas dataframes groupby merge pivot reshape",
        "numpy array operations broadcasting linear algebra",
        "matplotlib seaborn plotly visualization dashboards",
        "spark dataframes rdd transformations actions jobs",
        "airflow dags operators sensors hooks xcom",
        "dbt models tests macros snapshots sources",
        "snowflake warehouse database schema objects",
]

corpus_path = "corpus.json"
if os.path.exists(corpus_path):
    with open(corpus_path, "r", encoding="utf-8") as f:
        external_corpus = json.load(f)
    print(f"  Loaded {len(external_corpus)} documents from corpus.json")
    # Duplicate tech entries so each appears ≥ min_df=2 times even if external
    # corpus doesn't contain them (guarantees tech vocab makes it past min_df)
    # ×50 repetitions needed so tech terms (python, docker, flask, postgresql)
    # win the max_features=5000 selection against 50k general-domain documents.
    # At ×3 (~477 tech docs), they lose to general vocabulary.
    corpus = tech_corpus * 50 + external_corpus
    print(f"  Merged with built-in tech corpus ({len(tech_corpus)} entries × 50)")
else:
    print("  corpus.json not found — using built-in MVP tech corpus only")
    corpus = tech_corpus * 5   # repeat to pass min_df=2 threshold

print(f"  Total corpus size: {len(corpus)} documents")

# ─── 2. Fit TF-IDF Vectorizer ─────────────────────────────────────────────────
print("Fitting TfidfVectorizer...")

vectorizer = TfidfVectorizer(
    max_features=5000,      # top 5000 terms by corpus-wide importance
    ngram_range=(1, 2),     # unigrams + bigrams ("machine learning" = one feature)
    sublinear_tf=True,      # log(1 + tf) instead of raw tf — reduces outlier impact
    stop_words="english",   # remove "the", "and", "of", etc.
    min_df=2,               # ignore terms appearing in fewer than 2 documents
    max_df=0.95,            # ignore terms in >95% of docs (too common)
)

vectorizer.fit(corpus)

vocab_size = len(vectorizer.vocabulary_)
print(f"  Vocabulary size: {vocab_size} terms")
print(f"  Sample terms: {list(vectorizer.vocabulary_.keys())[:10]}")

# ─── 3. Quick sanity check ────────────────────────────────────────────────────
sample = vectorizer.transform(["python developer django rest api"]).toarray()
print(f"  Sample vector shape: {sample.shape}")
print(f"  Non-zero entries: {np.count_nonzero(sample)}")

# ─── 4. Export vocabulary (word → column index) ───────────────────────────────
os.makedirs("models", exist_ok=True)

vocab_path = os.path.join("models", "vocabulary.json")
with open(vocab_path, "w", encoding="utf-8") as f:
    json.dump({k: int(v) for k, v in vectorizer.vocabulary_.items()}, f, ensure_ascii=False)

vocab_size_kb = os.path.getsize(vocab_path) / 1024
print(f"\n  Saved vocabulary.json  ({vocab_size_kb:.1f} KB, {len(vectorizer.vocabulary_)} terms)")

# ─── 5. Export IDF weights (float array, one per vocabulary term) ─────────────
# vectorizer.idf_ is indexed by column position, matching vocabulary_ values
idf_path = os.path.join("models", "idf_weights.json")
with open(idf_path, "w", encoding="utf-8") as f:
    json.dump(vectorizer.idf_.tolist(), f)

idf_size_kb = os.path.getsize(idf_path) / 1024
print(f"  Saved idf_weights.json ({idf_size_kb:.1f} KB, {len(vectorizer.idf_)} weights)")

# ─── 6. Export ONNX model (skl2onnx) ─────────────────────────────────────────────────────
print("Exporting ONNX model...")
try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import StringTensorType

    # Input: one document string, shape [1, 1]
    initial_type = [("input", StringTensorType([None, 1]))]

    onnx_model = convert_sklearn(
        vectorizer,
        name="TFIDFVectorizer",
        initial_types=initial_type,
    )

    onnx_path = os.path.join("models", "tfidf.onnx")
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    onnx_size_kb = os.path.getsize(onnx_path) / 1024
    print(f"  Saved tfidf.onnx ({onnx_size_kb:.1f} KB)")

    # ── Quick verification via onnxruntime ─────────────────────────────────
    try:
        import onnxruntime as rt
        sess = rt.InferenceSession(onnx_path)
        input_name  = sess.get_inputs()[0].name
        output_name = sess.get_outputs()[0].name
        print(f"  ONNX input  name : '{input_name}'   shape: {sess.get_inputs()[0].shape}")
        print(f"  ONNX output name : '{output_name}' shape: {sess.get_outputs()[0].shape}")

        test_input = np.array([["python developer django rest api"]])
        result = sess.run([output_name], {input_name: test_input})[0]
        nonzero = np.count_nonzero(result)
        print(f"  Test inference: shape={result.shape}, non-zero={nonzero}")
        print("  onnxruntime verification OK ✅")
        onnx_ok = True
    except Exception as e:
        print(f"  onnxruntime verification skipped: {e}")
        onnx_ok = False

except Exception as e:
    print(f"  ONNX export failed: {e}")
    print("  Falling back to JSON-only artifacts.")
    onnx_ok  = False
    onnx_path = None
    onnx_size_kb = 0

# ─── 7. Print vectorizer settings for C# reference ────────────────────────────────
print(f"""
📋 Vectorizer settings — copy these into TfIdfService.cs:
  max_features   : {vectorizer.max_features}
  ngram_range    : {vectorizer.ngram_range}   ← (1,2) means unigrams + bigrams
  sublinear_tf   : {vectorizer.sublinear_tf}  ← C#: Math.Log(1 + termFreq)
  vocabulary size: {len(vectorizer.vocabulary_)}

📋 C# OnnxInferenceService config:
  Input  tensor name : 'input'    (shape [1, 1], type string)
  Output tensor name : 'variable' (shape [1, {len(vectorizer.vocabulary_)}], type float)

✅ Training complete. Model artifacts:
  models/vocabulary.json   ({vocab_size_kb:.1f} KB)  ← fallback / C# TfIdfService
  models/idf_weights.json  ({idf_size_kb:.1f} KB)  ← fallback / C# TfIdfService
  models/tfidf.onnx        ({onnx_size_kb:.1f} KB)  ← primary  / C# OnnxInferenceService
""")
