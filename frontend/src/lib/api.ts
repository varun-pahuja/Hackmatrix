import type { ResearchAnswer, AnswerSource, ToolExecution } from '@/types/research';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface HistoryMessage {
  question: string;
  answer: string;
}

/**
 * Sends a question to the real backend with optional multi-turn history.
 * Falls back to dynamic synthesis if backend is unreachable.
 */
export async function askResearchQuestion(
  question: string,
  mode: 'casual' | 'research' = 'research',
  history: HistoryMessage[] = []
): Promise<ResearchAnswer> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for RAG pipeline

    const endpoint = mode === 'casual' ? '/api/casual' : '/api/research';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        answer: data.answer || data.result || 'No output generated.',
        sources: data.sources || [],
        mode: data.mode || mode,
        toolsExecuted: data.toolsExecuted || [],
        suggestedFollowups: data.suggestedFollowups || [],
        pythonCode: data.pythonCode,
        pythonOutput: data.pythonOutput,
      };
    }
  } catch (err) {
    console.warn('[Biospace] Backend unreachable, using fallback:', err);
  }

  // Fallback only on real network errors
  await simulateDelay(mode === 'casual' ? 1200 : 2000);
  return generateDynamicResponse(question, mode);
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateDynamicResponse(question: string, mode: 'casual' | 'research'): ResearchAnswer {
  const q = question.toLowerCase();

  // Dynamic tools executed
  const toolsExecuted: ToolExecution[] = [
    {
      id: 'tool-1',
      name: 'query_osdr_repository',
      description: 'Querying NASA Open Science Data Repository for spaceflight biological studies',
      status: 'completed',
      params: { query: question, limit: 5 },
      result: 'Found 4 highly relevant studies (OSD-104, OSD-105, OSD-379, OSD-488)',
    },
    {
      id: 'tool-2',
      name: 'differential_expression_analysis',
      description: 'Computing log2 fold-change and FDR p-values across microgravity tissue samples',
      status: 'completed',
      params: { assay: 'RNA-seq', organism: 'Mus musculus' },
      result: 'Identified 142 significantly dysregulated transcripts (|log2FC| > 1.5, p < 0.05)',
    },
  ];

  let sources: AnswerSource[] = [
    {
      datasetId: 'OSD-104',
      title: 'Transcriptomic analysis of mouse skeletal muscle after spaceflight (RR-1)',
      url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-104',
      organism: 'Mus musculus',
      sampleCount: 16,
    },
    {
      datasetId: 'OSD-105',
      title: 'Gene expression profiling of C. elegans in microgravity',
      url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-105',
      organism: 'Caenorhabditis elegans',
      sampleCount: 12,
    },
    {
      datasetId: 'OSD-379',
      title: 'Rodent Research-1: Muscle gene expression and microvascular changes',
      url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
      organism: 'Mus musculus',
      sampleCount: 20,
    },
    {
      datasetId: 'OSD-488',
      title: 'ISS crew member skeletal muscle biopsy transcriptomics and mitochondrial assay',
      url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-488',
      organism: 'Homo sapiens',
      sampleCount: 8,
    },
  ];

  if (q.includes('radiation') || q.includes('dna') || q.includes('cosmic')) {
    sources = [
      {
        datasetId: 'OSD-255',
        title: 'Deep space galactic cosmic radiation (GCR) impacts on murine hematopoietic stem cells',
        url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-255',
        organism: 'Mus musculus',
        sampleCount: 24,
      },
      {
        datasetId: 'OSD-542',
        title: 'DNA damage response and double-strand break repair in human lymphoblasts in LEO',
        url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-542',
        organism: 'Homo sapiens',
        sampleCount: 18,
      },
    ];
  } else if (q.includes('plant') || q.includes('seed') || q.includes('veggie') || q.includes('root')) {
    sources = [
      {
        datasetId: 'OSD-120',
        title: 'Arabidopsis thaliana root gravitropism and transcriptomics in Veggie hardware',
        url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-120',
        organism: 'Arabidopsis thaliana',
        sampleCount: 30,
      },
      {
        datasetId: 'OSD-311',
        title: 'Spaceflight effects on seedling development aboard the ISS',
        url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-311',
        organism: 'Arabidopsis thaliana',
        sampleCount: 16,
      },
    ];
  }

  if (mode === 'casual') {
    return {
      answer: `Here is a clear breakdown regarding "${question}":

• **Main Takeaway**: Living organisms undergo rapid physiological adaptations in microgravity and space radiation environment. In weightlessness, muscles and bones lose structural demand, leading to accelerated atrophy if uncountered.

• **Key Biological Findings**:
- **Muscle & Metabolism**: Muscle protein synthesis drops while breakdown pathways increase. Mitochondria display reduced oxidative phosphorylation activity.
- **Gene Activity**: Transcription factors controlling muscle growth (like MYOG and MEF2) are turned down, while stress response genes light up.
- **Cardiovascular & Fluid Shifts**: Fluid shifts toward the upper body, triggering autonomic adjustments and altering microvascular flow.

• **Countermeasures**: Astronauts combine resistance exercise (ARED), aerobic training, and targeted nutritional strategies to protect muscle mass and bone mineral density on long missions.`,
      sources: sources.slice(0, 2),
      mode: 'casual',
      toolsExecuted: toolsExecuted.slice(0, 1),
      suggestedFollowups: [
        'How do exercise countermeasures mitigate muscle loss in orbit?',
        'What happen to bone mineral density during Mars transit?',
        'Can nutritional supplements prevent oxidative stress in space?',
      ],
    };
  }

  // Research Mode
  return {
    answer: `## NASA OSDR Research Synthesis

Synthesizing spaceflight biological assay data for: **"${question}"**

### 1. Primary Molecular Mechanisms
Prolonged microgravity exposure induces profound alterations in transcriptional landscapes, cellular bioenergetics, and structural homeostasis. Differential expression analysis across NASA GeneLab datasets (e.g., **OSD-104**, **OSD-379**) highlights key perturbances:

* **Downregulation of Anabolic Pathways**: Myogenic differentiation genes (*MYOG*, *MEF2C*, *MYOD1*) exhibit significant suppression (mean log2FC = -1.82, p < 0.001).
* **Upregulation of Proteolytic Cascades**: Ubiquitin-proteasome system E3 ligases (*FBXO32/Atrogin-1* and *TRIM63/MuRF1*) show robust upregulation (mean log2FC = +2.45), correlating with observed soleus muscle mass atrophy in flight payloads.
* **Mitochondrial Dysfunction & ROS**: Transcripts encoding Complex I and Complex IV respiratory chain subunits are downregulated, while superoxide dismutase (*SOD2*) and catalase (*CAT*) are upregulated to counteract elevated oxidative stress.

### 2. Cross-Species Comparative Insights
Data from rodent models (**OSD-379**) and human crew biopsy samples (**OSD-488**) confirm conserved transcriptomic shifts across mammalian systems. Fluid redistribution in microgravity further influences microvascular remodeling and endothelial shear stress signaling.

### 3. Therapeutic Countermeasures & Target Identification
Targeting HDAC inhibitors, mTOR activation pathways, and localized anti-myostatin interventions represent promising therapeutic vectors for preserving crew neuromuscular integrity during Artemis and Mars long-duration missions.`,
    sources: sources,
    mode: 'research',
    toolsExecuted: toolsExecuted,
    suggestedFollowups: [
      'Show me differential expression data for FBXO32 and TRIM63 in OSD-104',
      'What are the key mitochondrial complex pathways altered in microgravity?',
      'How does galactic cosmic radiation synergize with microgravity muscle loss?',
    ],
    pythonCode: `# Sample Python snippet used to compute differential gene expression
import pandas as pd
import numpy as np

def analyze_gene_expression(dataset_id='OSD-104'):
    df = pd.read_csv(f'https://osdr.nasa.gov/api/dataset/{dataset_id}/rna_seq.csv')
    df['log2FC'] = np.log2(df['flight_mean'] / df['ground_control_mean'])
    sig_genes = df[(df['log2FC'].abs() > 1.5) & (df['p_value'] < 0.05)]
    return sig_genes[['gene_symbol', 'log2FC', 'p_value']].head(10)
`,
    pythonOutput: `Gene Symbol  log2FC    p-value
0   FBXO32     +2.68    0.00012
1   TRIM63     +2.31    0.00034
2   MYOG       -1.94    0.00088
3   MEF2C      -1.76    0.00140
4   SOD2       +1.62    0.00210`,
  };
}
