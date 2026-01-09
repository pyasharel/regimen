import Foundation
import Capacitor

@objc(TestFlightDetectorPlugin)
public class TestFlightDetectorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TestFlightDetectorPlugin"
    public let jsName = "TestFlightDetector"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isTestFlight", returnType: CAPPluginReturnPromise)
    ]
    
    @objc public func isTestFlight(_ call: CAPPluginCall) {
        var isTestFlight = false
        
        // Check if the app was installed from TestFlight
        // TestFlight builds have a receipt in the "sandboxReceipt" path
        if let receiptURL = Bundle.main.appStoreReceiptURL {
            isTestFlight = receiptURL.path.contains("sandboxReceipt")
            NSLog("TestFlightDetectorPlugin: Receipt URL path: \(receiptURL.path)")
            NSLog("TestFlightDetectorPlugin: isTestFlight = \(isTestFlight)")
        } else {
            NSLog("TestFlightDetectorPlugin: No receipt URL found")
        }
        
        call.resolve(["isTestFlight": isTestFlight])
    }
}
