const fs = require('fs');
const file = 'src/app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `<FlatList\\n          data={(!isGpsDisabled && !feedError && !isLoading) ? filtered : []}\\n          keyExtractor={(item) => item.id ?? Math.random().toString()}\\n          showsVerticalScrollIndicator={false}\\n          contentContainerStyle={{ paddingBottom: 112, backgroundColor: T.bg }}\\n          refreshControl={\\n            <RefreshControl refreshing={isLoading} onRefresh={fetchFeed} colors={[T.primary]} />\\n          }\\n          ListHeaderComponent={\\n            <View>\\n              `;

const newStr = `<FlatList
          data={(!isGpsDisabled && !feedError && !isLoading) ? filtered : []}
          keyExtractor={(item) => item.id ?? Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 112, backgroundColor: T.bg }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchFeed} colors={[T.primary]} />
          }
          ListHeaderComponent={
            <View>
              `;

content = content.replace(oldStr, newStr);

// To be safe, just replace all \\n with actual newlines in this specific block if the exact match fails
if (!content.includes(newStr)) {
    console.log("Exact replacement failed, doing regex replace on the block");
    const regex = /<FlatList\\n[\s\S]*?<View>\\n\s*/g;
    content = content.replace(regex, (match) => match.replace(/\\n/g, '\n'));
}

fs.writeFileSync(file, content);
console.log("Done");