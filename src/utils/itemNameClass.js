/**
 * 物品名称标签统一排版规则。
 *
 * 背景：英文物品名常为 "Swimming Crab" / "Dungeness Crab" / "White Shrimp"
 *       这类 2 词短语，在原先 text-[9px] + truncate 的单行截断下会变成
 *       "Swimmin..." 不可读。该工具给出按语言自适应的 className 组合：
 *         - 中文：保持原先紧凑单行（2-4 字视觉最佳）
 *         - 英文：缩到 8px + line-clamp-2 + break-words 两行换行
 *
 * size：
 *   - 'md'   ≈ w-14 / 56px 级别（默认，basket / fridge / wall / inventory）
 *   - 'sm'   ≈ w-10~12 / 40-48px 级别（requirement 小胶囊、overlay）
 *
 * NOTE: Tailwind JIT 必须看到字面类名，所以此处以 if/else 返回整串字面
 *       string，不要改为动态拼接 `text-[${n}px]`。
 */
export const itemNameClass = (language, size = 'md') => {
    const isEn = language === 'en';
    if (size === 'sm') {
        return isEn
            ? 'text-[7px] font-bold leading-[1.1] line-clamp-2 break-words max-w-full text-center px-0.5'
            : 'text-[8px] font-bold leading-tight truncate max-w-full text-center';
    }
    // 'md' (default)
    return isEn
        ? 'text-[8px] font-bold leading-[1.1] line-clamp-2 break-words max-w-full text-center px-0.5'
        : 'text-[9px] font-bold leading-tight truncate max-w-full text-center';
};
