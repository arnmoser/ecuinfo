type FramePageProps = {
  title: string;
  src: string;
};

export function FramePage({ title, src }: FramePageProps) {
  return (
    <section className="frame-page">
      <iframe className="content-frame" title={title} src={src} />
    </section>
  );
}
