# Template execution contract

- Reference: `C:\Users\Parth\Downloads\Literature_Review_Paper_IEEE_5pages (1).docx`
- SHA-256 before editing: `4a1bec917f837f4a93b9a233406b635bd927c6d1ce8e8fe000cc292f2faeb54a`
- Source rendering: Microsoft Word COM export to PDF, then bundled pypdfium2 rasterization; source has 6 pages.
- Page system: US Letter portrait, 0.75-in left/right, 1-in top/bottom margins. Four sections; section 1 is single-column title/abstract beginning, section 2 and 4 are two-column, continuous section breaks. Preserve exact section geometry and image placement.
- Typography/layout: existing Times New Roman-like serif, title 24 pt centered, body appears 11 pt, justified, IEEE-like Roman-number section heads centered, alphabetic subsection heads italic. Keep existing title/author block, architecture figure and caption, functional-test table.
- Tables: full-width five-column study comparison table with gray header and shaded body rows, and three-column observed test outcomes table. Keep intended table sizes/geometry while removing all placeholders and completing selected-study rows.
- Content order: title/authors; abstract/keywords; Introduction; Literature Review; Comparison; Research Gap; Proposed Work (overview, architecture, modules, development method, functional testing, security considerations); Conclusion/Future Scope; References.
- Edit scope: improve the literature review with a transparent focused-narrative method and 16 verified works; correct claims about novelty and prior work; replace incomplete/empty comparison rows; complete reference list; retain source project description, cautious test claims, architecture diagram, and existing IEEE-like style.
- Package preservation: original contains 13 ZIP parts including `word/media/image1.png`; preserve existing image, section/page settings, styles, header/footer parts, and all non-target content. Edit a copy only.
- Fidelity gates: final render via Word COM PDF export + pypdfium2; inspect every page PNG at 100%; preserve source geometry and diagram; final page count 6-8; no placeholder text, empty matrix rows, clipping, overlap, missing glyphs, split table defects, or excessive blank pages. Retained source must remain byte-identical.
