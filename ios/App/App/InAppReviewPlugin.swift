import Capacitor
import StoreKit

@objc(InAppReviewPlugin)
public class InAppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InAppReviewPlugin"
    public let jsName = "InAppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]
    
    override public func load() {
        print("InAppReviewPlugin loaded successfully")
    }
    
    @objc public func requestReview(_ call: CAPPluginCall) {
        print("InAppReviewPlugin: requestReview called")
        DispatchQueue.main.async { [weak self] in
            print("InAppReviewPlugin: Executing on main thread")
            if #available(iOS 14.0, *) {
                if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                    print("InAppReviewPlugin: Found foreground active window scene, requesting review")
                    SKStoreReviewController.requestReview(in: scene)
                    call.resolve(["success": true])
                } else if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    print("InAppReviewPlugin: Found window scene (fallback), requesting review")
                    SKStoreReviewController.requestReview(in: scene)
                    call.resolve(["success": true])
                } else {
                    print("InAppReviewPlugin: No window scene found")
                    call.reject("No window scene available")
                }
            } else {
                print("InAppReviewPlugin: iOS version < 14.0, using legacy API")
                SKStoreReviewController.requestReview()
                call.resolve(["success": true])
            }
        }
    }
}
