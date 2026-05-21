export const genPostSlug = ({
    title,
    date = new Date(),
    maxLength = 80,
  }) => {
    const d = new Date(date);
  
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
  
    const words =
      title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/ß/g, "ss")
        .replace(/[\u0300-\u036f]/g, "")
        .match(/[a-z0-9]+/g) || [];
  
    const result = [];
  
    let currentLength = 0;
  
    for (const word of words) {
      const nextLength =
        currentLength +
        word.length +
        (result.length ? 1 : 0);
  
      if (nextLength > maxLength) {
        break;
      }
  
      result.push(word);
  
      currentLength = nextLength;
    }
  
    const slug = result.join("-") || "untitled";
  
    return `${year}/${month}/${slug}`;
  };