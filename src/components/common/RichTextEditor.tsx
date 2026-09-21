import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image,
  Video,
  Minus,
  Undo2,
  Redo2,
  Eraser,
  Eye,
  Code,
  Palette,
  Highlighter,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write content here...',
  minHeight = '320px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpenNewTab, setLinkOpenNewTab] = useState(true);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  // Synchronize incoming value with contentEditable without resetting selection on every keystroke
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const applyHeading = (level: 'h1' | 'h2' | 'h3' | 'h4' | 'p') => {
    exec('formatBlock', `<${level}>`);
  };

  const insertLink = () => {
    if (!linkUrl) return;
    const targetAttr = linkOpenNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const selection = window.getSelection();
    const text = selection?.toString() || linkUrl;
    const linkHtml = `<a href="${linkUrl}"${targetAttr} class="text-amber-700 underline font-medium hover:text-amber-800">${text}</a>`;
    exec('insertHTML', linkHtml);
    setLinkUrl('');
    setShowLinkModal(false);
  };

  const insertImage = () => {
    if (!imageUrl) return;
    const captionHtml = imageCaption ? `<figcaption class="text-xs text-center text-slate-500 mt-1 italic">${imageCaption}</figcaption>` : '';
    const imgHtml = `<figure class="my-4"><img src="${imageUrl}" alt="${imageCaption || 'Editorial image'}" class="w-full rounded-lg shadow-sm max-h-[450px] object-cover" />${captionHtml}</figure>`;
    exec('insertHTML', imgHtml);
    setImageUrl('');
    setImageCaption('');
    setShowImageModal(false);
  };

  const insertVideo = () => {
    if (!videoUrl) return;
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch?v=')) {
      embedUrl = videoUrl.replace('watch?v=', 'embed/');
    } else if (videoUrl.includes('youtu.be/')) {
      embedUrl = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/');
    } else if (videoUrl.includes('vimeo.com/')) {
      embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/');
    }

    const videoHtml = `
      <div class="my-6 aspect-video w-full rounded-lg overflow-hidden shadow-sm">
        <iframe src="${embedUrl}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    exec('insertHTML', videoHtml);
    setVideoUrl('');
    setShowVideoModal(false);
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-600 transition-all">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 text-slate-700 select-none">
        {/* Undo / Redo */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => exec('undo')}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('redo')}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => applyHeading('h1')}
            title="Heading 1"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h2')}
            title="Heading 2"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h3')}
            title="Heading 3"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h4')}
            title="Heading 4"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <Heading4 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyHeading('p')}
            title="Normal Paragraph"
            className="px-2 py-1 text-xs rounded hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            ¶ Normal
          </button>
        </div>

        {/* Formatting */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => exec('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            title="Italic (Ctrl+I)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('underline')}
            title="Underline (Ctrl+U)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('strikeThrough')}
            title="Strikethrough"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            title="Bullet List"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            title="Numbered List"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyHeading('h3')} // fallback or blockquote
            title="Quote"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => exec('justifyLeft')}
            title="Align Left"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyCenter')}
            title="Align Center"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyRight')}
            title="Align Right"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyFull')}
            title="Justify"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-1">
          <label title="Text Color" className="cursor-pointer p-1.5 rounded hover:bg-slate-200 flex items-center gap-1 text-xs">
            <Palette className="w-4 h-4 text-slate-600" />
            <input
              type="color"
              onChange={(e) => exec('foreColor', e.target.value)}
              className="w-4 h-4 opacity-0 absolute pointer-events-none"
            />
          </label>
          <label title="Highlight Color" className="cursor-pointer p-1.5 rounded hover:bg-slate-200 flex items-center gap-1 text-xs">
            <Highlighter className="w-4 h-4 text-amber-600" />
            <input
              type="color"
              defaultValue="#fef08a"
              onChange={(e) => exec('hiliteColor', e.target.value)}
              className="w-4 h-4 opacity-0 absolute pointer-events-none"
            />
          </label>
        </div>

        {/* Inserts: Link, Image, Video, Divider */}
        <div className="flex items-center border-r border-slate-200 pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            title="Insert Link"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            title="Insert Photo"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowVideoModal(true)}
            title="Insert Video (YouTube / Vimeo)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertHorizontalRule')}
            title="Insert Horizontal Divider"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Clear & Preview */}
        <div className="flex items-center ml-auto gap-1">
          <button
            type="button"
            onClick={() => exec('removeFormat')}
            title="Clear Formatting"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-rose-600 transition-colors"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              isPreview ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {isPreview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isPreview ? 'Edit Code' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isPreview ? (
        <div
          className="p-6 overflow-y-auto prose-editorial bg-slate-50/50"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-slate-400 italic">No content to preview.</p>' }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="p-5 focus:outline-none overflow-y-auto prose-editorial leading-relaxed text-slate-800"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      {/* Modal: Insert Link */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 text-lg mb-3">Inserir Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL de Destino</label>
                <input
                  type="url"
                  placeholder="https://exemplo.org"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkOpenNewTab}
                  onChange={(e) => setLinkOpenNewTab(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Abrir link em nova guia (target="_blank")
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Inserir Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Insert Photo */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 text-lg mb-3">Inserir Fotografia</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL da Imagem</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Legenda / Texto Descritivo</label>
                <input
                  type="text"
                  placeholder="Equipe de ajuda humanitária em campo..."
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertImage}
                className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Inserir Imagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Insert Video */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 text-lg mb-3">Inserir Vídeo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Link do Vídeo (YouTube ou Vimeo)</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500">
                O vídeo será exibido de forma responsiva mantendo proporção de 16:9 na notícia publicada.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertVideo}
                className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Incorporar Vídeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
