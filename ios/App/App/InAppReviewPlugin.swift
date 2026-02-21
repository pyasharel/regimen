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
    }
    
    @objc public func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            if #available(iOS 14.0, *) {
                if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                    SKStoreReviewController.requestReview(in: scene)
                    call.resolve(["success": true])
                } else if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    SKStoreReviewController.requestReview(in: scene)
                    call.resolve(["success": true])
                } else {
                    call.reject("No window scene available")
                }
            } else {
                SKStoreReviewController.requestReview()
                call.resolve(["success": true])
            }
        }
    }
}
