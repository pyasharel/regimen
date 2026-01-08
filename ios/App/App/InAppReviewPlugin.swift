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
        print("InAppReviewPlugin loaded")
    }
    
    @objc func requestReview(_ call: CAPPluginCall) {
        print("requestReview called")
        DispatchQueue.main.async {
            print("Executing on main thread")
            if #available(iOS 14.0, *) {
                if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                    print("Found foreground active window scene, requesting review")
                    SKStoreReviewController.requestReview(in: scene)
                } else if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    print("Found window scene (fallback), requesting review")
                    SKStoreReviewController.requestReview(in: scene)
                } else {
                    print("No window scene found")
                }
            } else {
                print("iOS version < 14.0")
            }
            call.resolve()
        }
    }
}
