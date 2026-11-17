#import "VisitDocumentShare.h"
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>

static BOOL VisitIsAwsURL(NSURL *url) {
    NSString *host = url.host.lowercaseString;
    return [host isEqualToString:@"amazonaws.com"] || [host hasSuffix:@".amazonaws.com"];
}

static BOOL VisitIsDocumentURL(NSURL *url) {
    NSString *scheme = url.scheme.lowercaseString;
    return url.host.length > 0 && !url.user && !url.password &&
        ([scheme isEqualToString:@"https"] || [scheme isEqualToString:@"http"]);
}

static NSInteger VisitEffectivePort(NSURL *url) {
    return url.port ? url.port.integerValue :
        ([url.scheme.lowercaseString isEqualToString:@"https"] ? 443 : 80);
}

@interface VisitDocumentRedirectDelegate : NSObject <NSURLSessionTaskDelegate>
@property (nonatomic, copy) NSString *authorization;
@end

@implementation VisitDocumentRedirectDelegate

- (void)URLSession:(NSURLSession *)session
              task:(NSURLSessionTask *)task
willPerformHTTPRedirection:(NSHTTPURLResponse *)response
        newRequest:(NSURLRequest *)request
 completionHandler:(void (^)(NSURLRequest *))completionHandler {
    NSURL *previous = response.URL;
    NSURL *destination = request.URL;
    if (!VisitIsDocumentURL(destination)) {
        completionHandler(nil);
        return;
    }
    NSMutableURLRequest *redirect = [request mutableCopy];
    BOOL sameOrigin =
        [previous.scheme.lowercaseString isEqualToString:destination.scheme.lowercaseString] &&
        [previous.host.lowercaseString isEqualToString:destination.host.lowercaseString] &&
        VisitEffectivePort(previous) == VisitEffectivePort(destination);
    if (!sameOrigin || VisitIsAwsURL(destination)) self.authorization = nil;
    [redirect setValue:self.authorization forHTTPHeaderField:@"Authorization"];
    completionHandler(redirect);
}

@end

void VisitDownloadAndShare(NSString *link,
                           NSString *authToken,
                           RCTPromiseResolveBlock resolve,
                           RCTPromiseRejectBlock reject) {
    NSURL *url = [NSURL URLWithString:link];
    if (!VisitIsDocumentURL(url)) {
        reject(@"INVALID_DOCUMENT_URL", @"The document link is invalid.", nil);
        return;
    }
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    VisitDocumentRedirectDelegate *redirect = [VisitDocumentRedirectDelegate new];
    if (authToken.length && [url.scheme.lowercaseString isEqualToString:@"https"] && !VisitIsAwsURL(url)) {
        redirect.authorization = authToken;
        [request setValue:authToken forHTTPHeaderField:@"Authorization"];
    }
    NSURLSession *session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration
                                                         delegate:redirect
                                                    delegateQueue:nil];
    NSURLSessionDownloadTask *download = [session downloadTaskWithRequest:request
        completionHandler:^(NSURL *temporary, NSURLResponse *response, NSError *error) {
        [session finishTasksAndInvalidate];
        NSInteger status = [response isKindOfClass:[NSHTTPURLResponse class]] ?
            [(NSHTTPURLResponse *)response statusCode] : 0;
        if (error || !temporary || status < 200 || status >= 300) {
            reject(@"DOCUMENT_DOWNLOAD_FAILED", @"The document could not be downloaded.", nil);
            return;
        }
        NSFileManager *files = NSFileManager.defaultManager;
        NSURL *directory = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES]
            URLByAppendingPathComponent:[@"visit-document-" stringByAppendingString:NSUUID.UUID.UUIDString]
                            isDirectory:YES];
        NSString *name = response.suggestedFilename.lastPathComponent;
        if (!name.length || [name isEqualToString:@"."] || [name isEqualToString:@".."]) name = @"document";
        NSURL *file = [directory URLByAppendingPathComponent:name];
        if (![files createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:NULL] ||
            ![files moveItemAtURL:temporary toURL:file error:NULL]) {
            [files removeItemAtURL:directory error:NULL];
            reject(@"DOCUMENT_DOWNLOAD_FAILED", @"The document could not be saved.", nil);
            return;
        }
        dispatch_async(dispatch_get_main_queue(), ^{
            UIViewController *presenter = RCTPresentedViewController();
            if (!presenter.view.window || presenter.isBeingDismissed) {
                [files removeItemAtURL:directory error:NULL];
                reject(@"DOCUMENT_SHARE_FAILED", @"The share sheet is unavailable.", nil);
                return;
            }
            UIActivityViewController *sheet = [[UIActivityViewController alloc]
                initWithActivityItems:@[file] applicationActivities:nil];
            sheet.popoverPresentationController.sourceView = presenter.view;
            sheet.popoverPresentationController.sourceRect = presenter.view.bounds;
            sheet.completionWithItemsHandler = ^(UIActivityType type, BOOL completed, NSArray *items, NSError *shareError) {
                [files removeItemAtURL:directory error:NULL];
                if (shareError) reject(@"DOCUMENT_SHARE_FAILED", @"The document could not be shared.", nil);
                else resolve(nil);
            };
            [presenter presentViewController:sheet animated:YES completion:nil];
        });
    }];
    [download resume];
}
