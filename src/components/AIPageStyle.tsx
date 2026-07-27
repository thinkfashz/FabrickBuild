export function AIPageStyle({ css }: { css?: null | string }) {
  if (!css) return null
  return <style data-fabrickbuild-ai-style dangerouslySetInnerHTML={{ __html: css }} />
}
