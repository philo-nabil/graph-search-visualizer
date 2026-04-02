import BFSDFSViz from './graph_search_visualizer'

export default function App() {
  return (
    <>
      <BFSDFSViz />
      <section style={{ padding: '1rem' }}>
        <h2>Live Demo (Claude Artifact)</h2>
        <iframe
          src="https://claude.site/public/artifacts/142c18f6-ebf9-4e77-bb0d-df104c3537d8/embed"
          title="Claude Artifact"
          width="100%"
          height="600"
          style={{ border: 'none' }}
          allow="clipboard-write"
          allowFullScreen
        />
      </section>
    </>
  )
}
