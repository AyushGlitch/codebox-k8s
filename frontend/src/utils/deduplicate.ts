import * as Y from 'yjs';

export const deduplicateFiles = (doc: Y.Doc) => {
    const fileList = doc.getArray('fileList');
    const seen = new Set<string>();
    const duplicateIndices: number[] = [];

    fileList.forEach((file: any, index: number) => {
        if (seen.has(file.id)) {
            duplicateIndices.push(index);
        } else {
            seen.add(file.id);
        }
    });

    // Remove duplicates in reverse order to maintain correct indices
    duplicateIndices.reverse().forEach(index => {
        fileList.delete(index, 1);
    });

    console.log(`Removed ${duplicateIndices.length} duplicate files`);
}; 