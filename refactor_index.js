const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', '(tabs)', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add FlatList to imports
if (!content.includes('FlatList,')) {
    content = content.replace('RefreshControl,', 'RefreshControl,\n  FlatList,');
}

// 2. Extract Header part
const headerStartIdx = content.indexOf('<View>\n            {/* ── COMMUNITY OVERVIEW ── */}');
const listStartIdx = content.indexOf('{/* ── STATES AND FEED LIST ── */}');
if (headerStartIdx === -1 || listStartIdx === -1) {
    console.error("Could not find header boundaries");
    process.exit(1);
}

// 3. Extract Footer part
const footerStartIdx = content.indexOf('{/* ── SECTION DIVIDER ── */}');
const scrollEndIdx = content.indexOf('</ScrollView>', footerStartIdx);
if (footerStartIdx === -1 || scrollEndIdx === -1) {
    console.error("Could not find footer boundaries");
    process.exit(1);
}

const headerJSX = content.substring(headerStartIdx, footerStartIdx);
// Extract only up to STATES AND FEED LIST for header, and handle Empty state via ListEmptyComponent
const headerPart = content.substring(headerStartIdx, listStartIdx);

const footerJSX = content.substring(footerStartIdx, scrollEndIdx);

// Build ListEmptyComponent and ListHeaderComponent
const listEmptyAndState = content.substring(listStartIdx, content.indexOf(' feedItems.length === 0 ? (', listStartIdx));

// To make it easy without complex parsing, we can just put EVERYTHING before feedItems.map into ListHeaderComponent
// and EVERYTHING after into ListFooterComponent.
// Let's do exactly that.

const beforeMap = content.indexOf('{feedItems.map((post) => (');
const afterMap = content.indexOf('</View>\n            )}', beforeMap);

if (beforeMap === -1 || afterMap === -1) {
    console.error("Could not find map boundaries");
    process.exit(1);
}

const listHeaderContent = content.substring(headerStartIdx, beforeMap - 18); // up to <View style={{ paddingHorizontal: PX, paddingBottom: 16 }}>
const listFooterContent = content.substring(afterMap + 21, scrollEndIdx);

// Now construct the new JSX
const flatListJSX = `
          <FlatList
            data={feedItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 112 }}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => {
                  setIsLoading(true);
                  setTimeout(() => setIsLoading(false), 800);
                }}
                colors={[T.primary]}
                tintColor={T.primary}
              />
            }
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            ListHeaderComponent={() => (
              ${listHeaderContent}
            )}
            renderItem={({ item: post }) => (
              <View style={{ paddingHorizontal: PX }}>
                <PostCard
                  post={post}
                  onPress={() =>
                    post.isSos
                      ? router.push(\`/sos/\${(post as any).originalId}\` as any)
                      : router.push(\`/post/\${post.id}\` as any)
                  }
                  onLikePress={() =>
                    !post.isSos && handleLike(post as FirestorePost)
                  }
                  onCommentPress={() =>
                    post.isSos
                      ? router.push(\`/sos/\${(post as any).originalId}\` as any)
                      : router.push(\`/post/\${post.id}\` as any)
                  }
                />
              </View>
            )}
            ListFooterComponent={() => (
              <View>
                ${listFooterContent}
              </View>
            )}
          />
`;

// Replace the entire ScrollView
const scrollStartIdx = content.lastIndexOf('<ScrollView', headerStartIdx);
const newContent = content.substring(0, scrollStartIdx) + flatListJSX + content.substring(scrollEndIdx + 13);

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log("Successfully refactored index.tsx to use FlatList");
